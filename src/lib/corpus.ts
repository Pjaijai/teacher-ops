import fs from "node:fs";
import path from "node:path";
import { cosine } from "./embed";

/**
 * The RAG corpus: transcribed HKEAA material, chunked and embedded, stored as corpus/<subject>.json
 * (git-ignored, rebuilt by scripts/build-corpus.mts). Shapes mirror docs/design/database.md.
 */
export type Subject = "chi_writing" | "eng_writing" | "math_cp" | "math_m1" | "math_m2";

export type CorpusDocument = {
  id: string; // "chi-2025-L4-2"
  subject: Subject;
  kind: "exemplar" | "past_question" | "reference_solution";
  year: number;
  part: string | null; // "B" (乙部)
  questionNo: string | null;
  level: number | null;
  genre: string | null;
  sourcePath: string;
  pages: [number, number];
  split: "anchor" | "test";
  text: string;
};

export type CorpusChunk = {
  id: string;
  documentId: string;
  seq: number; // -1 = the whole document, 0.. = paragraphs
  text: string;
  metadata: { level: number | null; genre: string | null; year: number; part: string | null; questionNo: string | null };
  embedding: number[];
};

export type Corpus = {
  manifest: { subject: Subject; embeddingModel: string; dims: number; builtAt: string };
  documents: CorpusDocument[];
  chunks: CorpusChunk[];
};

const cache = new Map<Subject, Corpus>();

export function corpusPath(subject: Subject) {
  return path.join(process.cwd(), "corpus", `${subject}.json`);
}

export function loadCorpus(subject: Subject): Corpus {
  const hit = cache.get(subject);
  if (hit) return hit;
  const file = corpusPath(subject);
  if (!fs.existsSync(file)) throw new Error(`No corpus for ${subject}. Run: npm run corpus:build -- ${subject}`);
  const corpus = JSON.parse(fs.readFileSync(file, "utf8")) as Corpus;
  cache.set(subject, corpus);
  return corpus;
}

export type SearchHit = { chunk: CorpusChunk; document: CorpusDocument; score: number };

/**
 * Metadata filter, then cosine ranking. Held-out test documents are never returned,
 * so the scoring tests stay honest.
 */
export function search(
  corpus: Corpus,
  query: number[],
  opts: { wholeDocuments?: boolean; filter?: (doc: CorpusDocument, chunk: CorpusChunk) => boolean; limit?: number } = {},
): SearchHit[] {
  const docs = new Map(corpus.documents.map((d) => [d.id, d]));
  const hits: SearchHit[] = [];
  for (const chunk of corpus.chunks) {
    const document = docs.get(chunk.documentId)!;
    if (document.split !== "anchor") continue;
    if ((chunk.seq === -1) !== Boolean(opts.wholeDocuments)) continue;
    if (opts.filter && !opts.filter(document, chunk)) continue;
    hits.push({ chunk, document, score: cosine(query, chunk.embedding) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 10);
}
