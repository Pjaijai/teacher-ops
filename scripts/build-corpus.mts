/**
 * Build the RAG corpus from the HKEAA PDFs in paper/.
 *
 *   npm run corpus:build -- chi_writing [only-id-prefix]   e.g. chi-2025-L5 to try a few first
 *
 * Steps: render exemplar pages → transcribe (cached per exemplar in corpus/cache/) → split into
 * paragraphs → embed → write corpus/<subject>.json. Re-running only pays for what isn't cached.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { askStructured, type ImageInput } from "../src/lib/ai";
import type { Corpus, CorpusChunk, CorpusDocument, Subject } from "../src/lib/corpus";
import { embed, embedModel } from "../src/lib/embed";
import { stripMarkers } from "../src/lib/essay";
import { CHI_WRITING, exemplars } from "./corpus-sources";
import { renderPdf } from "./render-pdf.mjs";

try { process.loadEnvFile(".env.local"); } catch { /* rely on the environment */ }

const subject = process.argv[2] as Subject;
if (subject !== "chi_writing") {
  console.error("Usage: npm run corpus:build -- chi_writing   (other subjects not built yet)");
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

const SYSTEM = `You transcribe HKDSE Chinese Language Paper 2 candidate scripts (scanned handwriting on 原稿紙 grid paper).
Each script has 甲部 (practical writing, ends at 「甲部完」) and 乙部 (the essay). Transcribe both, separately.
- Copy EXACTLY what the candidate wrote, in whatever script they used (traditional, simplified or mixed). Never correct or convert anything.
- A malformed, non-existent character: write the intended character followed by "!" in brackets, e.g. [武!].
- A character you cannot read with confidence: your best reading followed by "?" in brackets, e.g. [已?].
- Apply the candidate's own insertions (marked with ∨ or ⋀) and skip crossed-out text.
- Keep the candidate's paragraphs (a new paragraph starts with indented empty squares); separate paragraphs with one blank line.
- Ignore printed headers, page numbers, margin notes and HKEAA labels such as 「第五級示例一」.`;

async function transcribe(ex: ReturnType<typeof exemplars>[number], id: string) {
  const cached = path.join(CACHE, `${id}.json`);
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, "utf8")) as z.infer<typeof ExemplarSchema>;

  const pngs = await renderPdf(ex.file, path.join(RENDER, id), `${ex.pages[0]}-${ex.pages[1]}`, 1.5);
  const images: ImageInput[] = pngs.map((p) => ({ mediaType: "image/png", data: fs.readFileSync(p).toString("base64") }));
  const result = await askStructured({
    name: "exemplar_transcription",
    system: SYSTEM,
    text: `These are pages ${ex.pages[0]}–${ex.pages[1]} of the ${ex.year} exemplar booklet: one complete candidate script, in page order.`,
    images,
    schema: ExemplarSchema,
  });
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cached, JSON.stringify(result, null, 2));
  return result;
}

const documents: CorpusDocument[] = [];
const pending: { chunk: Omit<CorpusChunk, "embedding"> }[] = [];

const only = process.argv[3];
for (const ex of exemplars(CHI_WRITING)) {
  const id = `chi-${ex.year}-L${ex.level}-${ex.n}`;
  if (only && !id.startsWith(only)) continue;
  process.stdout.write(`${id} … `);
  const t = await transcribe(ex, id);
  const text = stripMarkers(t.partB.text).clean.trim();
  const doc: CorpusDocument = {
    id, subject, kind: "exemplar", year: ex.year, part: "B",
    questionNo: t.partB.questionNo, level: ex.level, genre: t.partB.genre,
    sourcePath: ex.file, pages: ex.pages, split: ex.n === 4 ? "test" : "anchor", text,
  };
  documents.push(doc);
  const metadata = { level: ex.level, genre: doc.genre, year: ex.year, part: "B", questionNo: doc.questionNo };
  pending.push({ chunk: { id: `${id}#doc`, documentId: id, seq: -1, text, metadata } });
  text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length >= 20).forEach((p, seq) => {
    pending.push({ chunk: { id: `${id}#p${seq}`, documentId: id, seq, text: p, metadata } });
  });
  console.log(`${doc.split}, Q${doc.questionNo ?? "?"} ${doc.genre}, ${text.length} chars`);
}

console.log(`Embedding ${pending.length} chunks with ${embedModel()} …`);
const vectors = await embed(pending.map((p) => p.chunk.text));
const chunks: CorpusChunk[] = pending.map((p, i) => ({ ...p.chunk, embedding: vectors[i] }));

const corpus: Corpus = {
  manifest: { subject, embeddingModel: embedModel(), dims: vectors[0].length, builtAt: new Date().toISOString() },
  documents,
  chunks,
};
fs.writeFileSync(path.join("corpus", `${subject}.json`), JSON.stringify(corpus));
console.log(`Wrote corpus/${subject}.json: ${documents.length} documents, ${chunks.length} chunks, ${corpus.manifest.dims} dims.`);
