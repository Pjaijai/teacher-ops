import { desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { attempts, questions, writingEstimates, writingSubmissions } from "@/server/db/schema";

const PAGE = 20;
export type HistoryItem = {
  type: "writing" | "practice";
  id: string;
  questionId: string;
  title: string;
  subject: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  level: number | null;
  visibility: "private" | "public";
  createdAt: string;
};

/** The student's writing submissions and practice attempts, newest first; offset cursor. */
export async function listHistory(db: Db, userId: string, opts: { type?: "writing" | "practice"; cursor?: string }) {
  const offset = Math.max(0, Number.parseInt(opts.cursor ?? "0", 10) || 0);
  const take = offset + PAGE + 1;
  const items: HistoryItem[] = [];

  if (opts.type !== "practice") {
    const rows = await db
      .select({
        id: writingSubmissions.id,
        questionId: questions.id,
        title: questions.title,
        subject: questions.subject,
        status: writingSubmissions.status,
        visibility: writingSubmissions.visibility,
        createdAt: writingSubmissions.createdAt,
        level: writingEstimates.level,
        total: writingEstimates.totalMarks,
        max: writingEstimates.maxMarks,
      })
      .from(writingSubmissions)
      .innerJoin(questions, eq(questions.id, writingSubmissions.questionId))
      .leftJoin(writingEstimates, eq(writingEstimates.submissionId, writingSubmissions.id))
      .where(eq(writingSubmissions.userId, userId))
      .orderBy(desc(writingSubmissions.createdAt))
      .limit(take);
    for (const r of rows) {
      items.push({
        type: "writing",
        id: r.id,
        questionId: r.questionId,
        title: r.title,
        subject: r.subject,
        status: r.status,
        score: r.total != null ? Number(r.total) : null,
        maxScore: r.max != null ? Number(r.max) : null,
        level: r.level ?? null,
        visibility: r.visibility,
        createdAt: r.createdAt.toISOString(),
      });
    }
  }
  if (opts.type !== "writing") {
    const rows = await db
      .select({
        id: attempts.id,
        questionId: questions.id,
        title: questions.title,
        subject: questions.subject,
        status: attempts.status,
        visibility: attempts.visibility,
        createdAt: attempts.createdAt,
        score: attempts.score,
        maxScore: attempts.maxScore,
        mcCorrect: attempts.mcCorrect,
      })
      .from(attempts)
      .innerJoin(questions, eq(questions.id, attempts.questionId))
      .where(eq(attempts.userId, userId))
      .orderBy(desc(attempts.createdAt))
      .limit(take);
    for (const r of rows) {
      items.push({
        type: "practice",
        id: r.id,
        questionId: r.questionId,
        title: r.title,
        subject: r.subject,
        status: r.status,
        score: r.score != null ? Number(r.score) : r.mcCorrect != null ? (r.mcCorrect ? 1 : 0) : null,
        maxScore: r.maxScore != null ? Number(r.maxScore) : r.mcCorrect != null ? 1 : null,
        level: null,
        visibility: r.visibility,
        createdAt: r.createdAt.toISOString(),
      });
    }
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = items.slice(offset, offset + PAGE);
  return { items: page, nextCursor: items.length > offset + PAGE ? String(offset + PAGE) : null };
}
