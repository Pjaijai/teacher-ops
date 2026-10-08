import { and, cosineDistance, eq, sql, type SQL } from "drizzle-orm";
import type { Subject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";
import { corpusChunks, corpusDocuments } from "@/server/db/schema";

/**
 * Retrieval over the internal HKEAA corpus (pgvector, cosine). Held-out test documents
 * (split = 'test') are NEVER returned, so the accuracy tests stay honest. Nothing here is ever
 * shown to students.
 */
export type CorpusHit = {
  chunkId: string;
  documentId: string;
  level: number | null;
  genre: string | null;
  part: string | null;
  questionNo: string | null;
  year: number;
  text: string;
  similarity: number;
};

type Filters = { subject: Subject; part?: string | null; level?: number; genre?: string | null; wholeDocuments?: boolean };

function where(f: Filters): SQL | undefined {
  return and(
    eq(corpusDocuments.split, "anchor"),
    eq(corpusDocuments.subject, f.subject),
    f.part ? eq(corpusDocuments.part, f.part) : undefined,
    f.level !== undefined ? eq(corpusDocuments.level, f.level) : undefined,
    f.wholeDocuments === false ? sql`${corpusChunks.seq} >= 0` : eq(corpusChunks.seq, -1),
  );
}

export async function searchCorpus(db: Db, embedding: number[], f: Filters & { limit?: number }): Promise<CorpusHit[]> {
  const distance = cosineDistance(corpusChunks.embedding, embedding);
  // Same genre is a mild preference, not a filter.
  const rank = f.genre ? sql`(${distance}) - case when ${corpusDocuments.genre} = ${f.genre} then 0.05 else 0 end` : distance;
  const rows = await db
    .select({
      chunkId: corpusChunks.id,
      documentId: corpusDocuments.id,
      level: corpusDocuments.level,
      genre: corpusDocuments.genre,
      part: corpusDocuments.part,
      questionNo: corpusDocuments.questionNo,
      year: corpusDocuments.year,
      text: corpusChunks.text,
      distance: sql<number>`${distance}`,
    })
    .from(corpusChunks)
    .innerJoin(corpusDocuments, eq(corpusChunks.documentId, corpusDocuments.id))
    .where(where(f))
    .orderBy(rank)
    .limit(f.limit ?? 10);
  return rows.map(({ distance: d, ...r }) => ({ ...r, similarity: 1 - Number(d) }));
}

/** Calibration anchors: the most similar whole exemplar at each level (5 → 1), anchors only. */
export async function pickLevelAnchors(db: Db, embedding: number[], f: Omit<Filters, "level" | "wholeDocuments">): Promise<CorpusHit[]> {
  const out: CorpusHit[] = [];
  for (const level of [5, 4, 3, 2, 1]) {
    const [hit] = await searchCorpus(db, embedding, { ...f, level, wholeDocuments: true, limit: 1 });
    if (hit) out.push(hit);
  }
  return out;
}

/** Does the anchor set exist for this subject (and part)? Without it, scoring is rubric-only. */
export async function hasAnchors(db: Db, subject: Subject, part?: string | null) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(corpusDocuments)
    .where(and(eq(corpusDocuments.subject, subject), eq(corpusDocuments.split, "anchor"), part ? eq(corpusDocuments.part, part) : undefined));
  return Number(row?.n ?? 0) > 0;
}
