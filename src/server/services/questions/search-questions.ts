import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import type { SearchQuery } from "@/lib/schemas/question";
import { embedOne } from "@/server/ai/embed";
import type { Db } from "@/server/db/client";
import { questionViews, questions } from "@/server/db/schema";
import { toPublic } from "./question-bank";

const PAGE = 20;
const CANDIDATES = 100;
const RRF_K = 60;

/** Public, active bank questions that match the structured filters. */
function filters(db: Db, userId: string, q: SearchQuery): SQL[] {
  const w: SQL[] = [eq(questions.status, "active"), isNull(questions.ownerId)];
  if (q.subject) w.push(eq(questions.subject, q.subject));
  if (q.topic?.length) w.push(sql`${questions.topicIds} && ARRAY[${sql.join(q.topic.map((t) => sql`${t}`), sql`, `)}]::text[]`);
  if (q.kind) w.push(eq(questions.kind, q.kind));
  if (q.part) w.push(eq(questions.part, q.part));
  if (q.difficulty) w.push(eq(questions.difficulty, q.difficulty));
  if (q.extension) w.push(eq(questions.extension, q.extension === "true"));
  if (q.language) w.push(eq(questions.language, q.language));
  if (q.unattempted === "true") {
    w.push(sql`not exists (select 1 from ${questionViews} where ${questionViews.questionId} = ${questions.id} and ${questionViews.userId} = ${userId} and ${questionViews.attempted})`);
  }
  void db;
  return w;
}

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Ids ranked by keyword/trigram match (works for Chinese via ILIKE even without trigram support). */
async function lexicalIds(db: Db, where: SQL[], text: string): Promise<string[]> {
  const tokens = [...new Set(text.split(/\s+/).filter((t) => t.length >= 1))].slice(0, 6);
  const phrase = `%${likeEscape(text)}%`;
  const tokenMatches = tokens.map((t) => sql`(case when ${questions.searchText} ilike ${`%${likeEscape(t)}%`} then 1 else 0 end)`);
  const hits = sql.join(tokenMatches, sql` + `);
  const rows = await db
    .select({ id: questions.id })
    .from(questions)
    .where(
      and(
        ...where,
        or(sql`${questions.searchText} % ${text}`, ilike(questions.searchText, phrase), ilike(questions.title, phrase), sql`(${hits}) > 0`),
      ),
    )
    .orderBy(
      desc(sql`(case when ${questions.searchText} ilike ${phrase} then 2 else 0 end) + (${hits}) + similarity(${questions.searchText}, ${text})`),
      desc(questions.createdAt),
    )
    .limit(CANDIDATES);
  return rows.map((r) => r.id);
}

async function semanticIds(db: Db, where: SQL[], text: string): Promise<string[] | null> {
  try {
    const vec = await embedOne(text);
    const literal = sql`${JSON.stringify(vec)}::vector`;
    const rows = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(...where, sql`${questions.embedding} is not null`))
      .orderBy(sql`${questions.embedding} <=> ${literal}`)
      .limit(CANDIDATES);
    return rows.map((r) => r.id);
  } catch (e) {
    console.warn("semantic search unavailable, using text match only:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Reciprocal-rank fusion of ranked id lists. */
export function rrf(lists: string[][]): string[] {
  const score = new Map<string, number>();
  for (const list of lists) list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (RRF_K + i + 1)));
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export async function searchQuestions(db: Db, userId: string, q: SearchQuery) {
  const offset = Math.max(0, Number.parseInt(q.cursor ?? "0", 10) || 0);
  const where = filters(db, userId, q);
  const text = q.q?.trim();
  const sort = q.sort ?? (text ? "relevance" : "new");

  const selection = {
    q: questions,
    attempted: sql<boolean>`coalesce(${questionViews.attempted}, false)`,
  };
  const joinOn = and(eq(questionViews.questionId, questions.id), eq(questionViews.userId, userId));

  const orderFor = (): SQL[] =>
    sort === "rating" ? [desc(sql`${questions.ratingUp} - ${questions.ratingDown}`), desc(questions.createdAt)] : [desc(questions.createdAt)];

  let rows: { q: typeof questions.$inferSelect; attempted: boolean }[];
  if (text) {
    const [lex, sem] = await Promise.all([lexicalIds(db, where, text), semanticIds(db, where, text)]);
    const ids = rrf(sem ? [sem, lex] : [lex]);
    const found = ids.length
      ? await db
          .select(selection)
          .from(questions)
          .leftJoin(questionViews, joinOn)
          .where(sql`${questions.id} in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`)
      : [];
    const byId = new Map(found.map((r) => [r.q.id, r]));
    let ordered = ids.map((i) => byId.get(i)!).filter(Boolean);
    if (sort === "rating") ordered = [...ordered].sort((a, b) => b.q.ratingUp - b.q.ratingDown - (a.q.ratingUp - a.q.ratingDown));
    else if (sort === "new") ordered = [...ordered].sort((a, b) => +b.q.createdAt - +a.q.createdAt);
    rows = ordered.slice(offset, offset + PAGE + 1);
    const hasMore = ordered.length > offset + PAGE;
    return { items: rows.slice(0, PAGE).map(toItem), nextCursor: hasMore ? String(offset + PAGE) : null, semantic: Boolean(sem) };
  }
  rows = await db
    .select(selection)
    .from(questions)
    .leftJoin(questionViews, joinOn)
    .where(and(...where))
    .orderBy(...orderFor())
    .limit(PAGE + 1)
    .offset(offset);
  return { items: rows.slice(0, PAGE).map(toItem), nextCursor: rows.length > PAGE ? String(offset + PAGE) : null, semantic: false };
}

function toItem(r: { q: typeof questions.$inferSelect; attempted: boolean }) {
  return { ...toPublic(r.q), attempted: Boolean(r.attempted) };
}
