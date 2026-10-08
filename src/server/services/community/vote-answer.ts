import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { answerReports, answerVotes, publicAnswers } from "@/server/db/schema";
import { ApiError, forbidden, notFound } from "@/server/errors";

const HIDE_AT = 3;

/** value: 1 | -1 | 0 (0 removes the vote). Counters are recomputed in the same transaction. */
export async function voteAnswer(db: Db, userId: string, answerId: string, value: 1 | -1 | 0) {
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(publicAnswers).where(eq(publicAnswers.id, answerId));
    if (!a || a.status !== "published") throw notFound("Answer not found");
    if (a.userId === userId) throw forbidden("You can't vote on your own answer.");
    if (value === 0) {
      await tx.delete(answerVotes).where(and(eq(answerVotes.userId, userId), eq(answerVotes.answerId, answerId)));
    } else {
      await tx
        .insert(answerVotes)
        .values({ userId, answerId, value })
        .onConflictDoUpdate({ target: [answerVotes.userId, answerVotes.answerId], set: { value } });
    }
    const [c] = await tx
      .select({
        up: sql<number>`count(*) filter (where ${answerVotes.value} = 1)::int`,
        down: sql<number>`count(*) filter (where ${answerVotes.value} = -1)::int`,
      })
      .from(answerVotes)
      .where(eq(answerVotes.answerId, answerId));
    await tx.update(publicAnswers).set({ upvotes: c.up, downvotes: c.down }).where(eq(publicAnswers.id, answerId));
    return { upvotes: c.up, downvotes: c.down, myVote: value };
  });
}

/** One report per reporter; the third open report hides the answer pending review. */
export async function reportAnswer(db: Db, userId: string, answerId: string, input: { reason: string; note?: string }) {
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(publicAnswers).where(eq(publicAnswers.id, answerId));
    if (!a || a.status === "removed") throw notFound("Answer not found");
    if (a.userId === userId) throw forbidden("You can't report your own answer.");
    const inserted = await tx
      .insert(answerReports)
      .values({ answerId, reporterId: userId, reason: input.reason, note: input.note ?? null })
      .onConflictDoNothing()
      .returning({ id: answerReports.id });
    if (!inserted.length) throw new ApiError(409, "conflict", "You already reported this answer.");
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(answerReports)
      .where(and(eq(answerReports.answerId, answerId), eq(answerReports.status, "open")));
    await tx
      .update(publicAnswers)
      .set({ reportCount: n, ...(n >= HIDE_AT && a.status === "published" ? { status: "hidden_reported" } : {}) })
      .where(eq(publicAnswers.id, answerId));
    return { reportCount: n, hidden: n >= HIDE_AT };
  });
}
