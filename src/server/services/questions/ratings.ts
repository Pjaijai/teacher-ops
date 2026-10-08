import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { questionRatings, questions } from "@/server/db/schema";

const REPORT_HIDE_AT = 3;

/** Set a thumbs value (1, -1, 0) or file a report; counters are recomputed from the ratings table. */
export async function rateQuestion(db: Db, userId: string, questionId: string, input: { value?: number; report?: string }) {
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(questionRatings)
      .where(and(eq(questionRatings.userId, userId), eq(questionRatings.questionId, questionId)));
    const value = input.value ?? existing?.value ?? 0;
    const reportReason = input.report ?? existing?.reportReason ?? null;
    if (existing) {
      await tx
        .update(questionRatings)
        .set({ value, reportReason })
        .where(and(eq(questionRatings.userId, userId), eq(questionRatings.questionId, questionId)));
    } else {
      await tx.insert(questionRatings).values({ userId, questionId, value, reportReason });
    }
    const [c] = await tx
      .select({
        up: sql<number>`count(*) filter (where ${questionRatings.value} = 1)::int`,
        down: sql<number>`count(*) filter (where ${questionRatings.value} = -1)::int`,
        reports: sql<number>`count(*) filter (where ${questionRatings.reportReason} is not null)::int`,
      })
      .from(questionRatings)
      .where(eq(questionRatings.questionId, questionId));
    await tx
      .update(questions)
      .set({
        ratingUp: c.up,
        ratingDown: c.down,
        reportCount: c.reports,
        ...(c.reports >= REPORT_HIDE_AT ? { status: "reported" as const } : {}),
      })
      .where(and(eq(questions.id, questionId), sql`${questions.status} in ('active','reported')`));
  });
  const [q] = await db
    .select({ up: questions.ratingUp, down: questions.ratingDown, reportCount: questions.reportCount, status: questions.status })
    .from(questions)
    .where(eq(questions.id, questionId));
  return q;
}
