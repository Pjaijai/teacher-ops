import { and, desc, eq, or, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { answerVotes, attempts, profiles, publicAnswers, writingSubmissions } from "@/server/db/schema";
import { forbidden } from "@/server/errors";
import { loadQuestion } from "../questions/question-bank";

const PAGE = 20;

/** Community answers unlock once the viewer has their own submission or attempt on the question. */
export async function hasOwnAnswer(db: Db, userId: string, questionId: string) {
  const [w] = await db
    .select({ id: writingSubmissions.id })
    .from(writingSubmissions)
    .where(and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.questionId, questionId), sql`${writingSubmissions.status} <> 'draft'`))
    .limit(1);
  if (w) return true;
  const [a] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.questionId, questionId)))
    .limit(1);
  return Boolean(a);
}

export async function listAnswers(db: Db, userId: string, questionId: string, opts: { sort: "top" | "new"; cursor?: string }) {
  const q = await loadQuestion(db, userId, questionId);
  if (q.ownerId) return { items: [], nextCursor: null };
  if (!(await hasOwnAnswer(db, userId, questionId))) throw forbidden("Answer the question first to see community answers.");
  const offset = Math.max(0, Number.parseInt(opts.cursor ?? "0", 10) || 0);
  const rows = await db
    .select({
      id: publicAnswers.id,
      userId: publicAnswers.userId,
      nickname: profiles.nickname,
      body: publicAnswers.body,
      sourceType: publicAnswers.sourceType,
      scoreSummary: publicAnswers.scoreSummary,
      feedbackSummary: publicAnswers.feedbackSummary,
      upvotes: publicAnswers.upvotes,
      downvotes: publicAnswers.downvotes,
      publishedAt: publicAnswers.publishedAt,
      myVote: answerVotes.value,
    })
    .from(publicAnswers)
    .leftJoin(profiles, eq(profiles.userId, publicAnswers.userId))
    .leftJoin(answerVotes, and(eq(answerVotes.answerId, publicAnswers.id), eq(answerVotes.userId, userId)))
    .where(and(eq(publicAnswers.questionId, questionId), or(eq(publicAnswers.status, "published"))))
    .orderBy(
      ...(opts.sort === "top"
        ? [desc(sql`${publicAnswers.upvotes} - ${publicAnswers.downvotes}`), desc(publicAnswers.publishedAt)]
        : [desc(publicAnswers.publishedAt)]),
    )
    .limit(PAGE + 1)
    .offset(offset);
  return {
    items: rows.slice(0, PAGE).map(({ userId: authorId, nickname, myVote, ...r }) => ({
      ...r,
      nickname: nickname ?? "student",
      isMine: authorId === userId,
      myVote: (myVote ?? 0) as 1 | -1 | 0,
    })),
    nextCursor: rows.length > PAGE ? String(offset + PAGE) : null,
  };
}
export type AnswerItem = Awaited<ReturnType<typeof listAnswers>>["items"][number];
