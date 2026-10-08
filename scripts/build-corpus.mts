/**
 * Build the internal RAG corpus (HKEAA exemplars) in Postgres: corpus_documents + corpus_chunks.
 *
 *   npm run corpus:build -- chi_writing [only-id-prefix]     e.g. chi-2025-L5 to try a few first
 *   npm run corpus:build -- chi_writing --from-json          import the legacy corpus/<subject>.json
 *                                                            (no AI calls: embeddings are truncated to 1024)
 *
 * Steps: render exemplar pages → transcribe (cached per exemplar in corpus/cache/<subject>/) →
 * split into paragraphs → embed → upsert. Re-running only pays for what isn't cached.
 * Exemplar #4 of each level is the held-out test split and is never retrieved by the app.
 * Uses DATABASE_URL when set, else the local PGlite database (PGLITE_DIR).
 */
import fs from "node:fs";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { stripMarkers } from "../src/features/writing/lib/text-markers";
import { embed } from "../src/server/ai/embed";
import { embedModel } from "../src/server/ai/models";
import { askStructured, type ImageInput } from "../src/server/ai/open-router";
import { getDb } from "../src/server/db/client";
import { corpusChunks, corpusDocuments } from "../src/server/db/schema";
import { EMBEDDING_DIMS } from "../src/server/db/schema/columns";
import { CHI_WRITING, exemplars } from "./corpus-sources";
import { renderPdf } from "./render-pdf.mjs";

try { process.loadEnvFile(".env.local"); } catch { /* rely on the environment */ }

type DocRow = typeof corpusDocuments.$inferInsert;
type ChunkRow = Omit<typeof corpusChunks.$inferInsert, "embedding">;

const args = process.argv.slice(2);
const subject = args[0];
const fromJson = args.includes("--from-json");
const only = args.slice(1).find((a) => !a.startsWith("--"));
if (subject !== "chi_writing") {
  console.error("Usage: npm run corpus:build -- chi_writing [id-prefix] [--from-json]   (other subjects not built yet)");
  process.exit(1);
}

const CACHE = path.join("corpus", "cache", subject);
const RENDER = path.join("corpus", "cache", "pages");

const ExemplarSchema = z.object({
  partB: z.object({
    questionNo: z.string().nullable().describe('乙部 question number answered, e.g. "2"; null if not visible'),
    title: z.string().nullable().describe("The essay title as written by the candidate, or null"),
    genre: z.enum(["記敘", "抒情", "描寫", "議論", "說明", "混合"]).describe("Main mode of the 乙部 essay"),
    text: z.string().describe("The 乙部 essay exactly as written, with [X?] / [X!] markers; paragraphs separated by one blank line"),
  }),
  partA: z.object({
    text: z.string().describe("The 甲部 answer exactly as written, same rules; empty string if absent"),
  }),
});
type Exemplar = z.infer<typeof ExemplarSchema>;

const SYSTEM = `You transcribe HKDSE Chinese Language Paper 2 candidate scripts (scanned handwriting on 原稿紙 grid paper).
Each script has 甲部 (practical writing, ends at 「甲部完」) and 乙部 (the essay). Transcribe both, separately.
- Copy EXACTLY what the candidate wrote, in whatever script they used (traditional, simplified or mixed). Never correct or convert anything.
- A malformed, non-existent character: write the intended character followed by "!" in brackets, e.g. [武!].
- A character you cannot read with confidence: your best reading followed by "?" in brackets, e.g. [已?].
- Apply the candidate's own insertions (marked with ∨ or ⋀) and skip crossed-out text.
- Keep the candidate's paragraphs (a new paragraph starts with indented empty squares); separate paragraphs with one blank line.
- Ignore printed headers, page numbers, margin notes and HKEAA labels such as 「第五級示例一」.`;

async function transcribe(ex: ReturnType<typeof exemplars>[number], id: string): Promise<Exemplar> {
  const cached = path.join(CACHE, `${id}.json`);
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, "utf8")) as Exemplar;

  const pngs = await renderPdf(ex.file, path.join(RENDER, id), `${ex.pages[0]}-${ex.pages[1]}`, 1.5);
  const images: ImageInput[] = pngs.map((p) => ({ mediaType: "image/png", data: fs.readFileSync(p).toString("base64") }));
  const result = await askStructured({
    purpose: "corpus_transcription",
    tier: "top",
    system: SYSTEM,
    text: `These are pages ${ex.pages[0]}–${ex.pages[1]} of the ${ex.year} exemplar booklet: one complete candidate script, in page order.`,
    images,
    schema: ExemplarSchema,
  });
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cached, JSON.stringify(result, null, 2));
  return result;
}

/** Matryoshka truncation, as the app's embed() does: keep the first dims, renormalise. */
function truncate(v: number[]) {
  const head = v.slice(0, EMBEDDING_DIMS);
  const n = Math.hypot(...head) || 1;
  return head.map((x) => x / n);
}

const documents: DocRow[] = [];
const chunks: ChunkRow[] = [];
let vectors: number[][] = [];

if (fromJson) {
  const file = path.join("corpus", `${subject}.json`);
  const legacy = JSON.parse(fs.readFileSync(file, "utf8")) as {
    documents: { id: string; kind: string; year: number; part: string | null; questionNo: string | null; level: number | null; genre: string | null; sourcePath: string; split: string; text: string }[];
    chunks: { id: string; documentId: string; seq: number; text: string; metadata: Record<string, unknown>; embedding: number[] }[];
  };
  for (const d of legacy.documents) {
    if (only && !d.id.startsWith(only)) continue;
    documents.push({ id: d.id, subject, kind: d.kind, year: d.year, part: d.part, questionNo: d.questionNo, level: d.level, genre: d.genre, sourcePath: d.sourcePath, split: d.split, text: d.text });
  }
  const keep = new Set(documents.map((d) => d.id));
  for (const c of legacy.chunks.filter((c) => keep.has(c.documentId))) {
    chunks.push({ id: c.id, documentId: c.documentId, seq: c.seq, text: c.text, metadata: c.metadata });
    vectors.push(truncate(c.embedding));
  }
  console.log(`Imported ${documents.length} documents and ${chunks.length} chunks from ${file}.`);
} else {
  for (const ex of exemplars(CHI_WRITING)) {
    const id = `chi-${ex.year}-L${ex.level}-${ex.n}`;
    if (only && !id.startsWith(only)) continue;
    process.stdout.write(`${id} … `);
    const t = await transcribe(ex, id);
    const text = stripMarkers(t.partB.text).clean.trim();
    const split = ex.n === 4 ? "test" : "anchor";
    documents.push({
      id, subject, kind: "exemplar", year: ex.year, part: "B", questionNo: t.partB.questionNo,
      level: ex.level, genre: t.partB.genre, sourcePath: ex.file, split, text,
    });
    const metadata = { level: ex.level, genre: t.partB.genre, year: ex.year, part: "B", questionNo: t.partB.questionNo };
    chunks.push({ id: `${id}#doc`, documentId: id, seq: -1, text, metadata });
    text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length >= 20).forEach((p, seq) => {
      chunks.push({ id: `${id}#p${seq}`, documentId: id, seq, text: p, metadata });
    });
    console.log(`${split}, Q${t.partB.questionNo ?? "?"} ${t.partB.genre}, ${text.length} chars`);
  }
  console.log(`Embedding ${chunks.length} chunks with ${embedModel()} (${EMBEDDING_DIMS} dims) …`);
  vectors = await embed(chunks.map((c) => c.text));
}

if (documents.length === 0) {
  console.log("Nothing to write.");
  process.exit(0);
}

const db = await getDb();
const ids = documents.map((d) => d.id!);
// Replace each document's chunks (paragraph splits may change between builds).
await db.delete(corpusChunks).where(inArray(corpusChunks.documentId, ids));
for (const d of documents) {
  await db.insert(corpusDocuments).values(d).onConflictDoUpdate({ target: corpusDocuments.id, set: { ...d, id: undefined } });
}
const rows = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
for (let i = 0; i < rows.length; i += 50) await db.insert(corpusChunks).values(rows.slice(i, i + 50));

const anchors = documents.filter((d) => d.split === "anchor").length;
console.log(`Wrote ${documents.length} documents (${anchors} anchor, ${documents.length - anchors} test) and ${rows.length} chunks.`);
process.exit(0);
