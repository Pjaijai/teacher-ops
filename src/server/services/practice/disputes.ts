import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { attemptMarks, markDisputes } from "@/server/db/schema";
import { ApiError, invalid } from "@/server/errors";
import { getOwnedAttempt } from "./attempts";

/** A student disagrees with a mark. Stored as test data for the marking accuracy bar (reviewed weekly). */
export async function createDispute(db: Db, userId: string, attemptId: string, input: { part: string; markIndex?: number | null; reason: string }) {
  const a = await getOwnedAttempt(db, userId, attemptId);
  if (a.status !== "marked") throw new ApiError(409, "conflict", "You can dispute a mark once the attempt is marked.");
  if (a.mcChoice === null) {
    const where = and(eq(attemptMarks.attemptId, a.id), eq(attemptMarks.part, input.part));
    const rows = await db.select({ markIndex: attemptMarks.markIndex }).from(attemptMarks).where(where);
    if (rows.length === 0) throw invalid("That part isn't in this attempt.");
    if (input.markIndex != null && !rows.some((r) => r.markIndex === input.markIndex)) throw invalid("That mark isn't in this part.");
  }
  const [d] = await db
    .insert(markDisputes)
    .values({ attemptId: a.id, part: input.part, markIndex: input.markIndex ?? null, studentReason: input.reason })
    .returning();
  return { id: d.id, part: d.part, markIndex: d.markIndex, reason: d.studentReason, status: d.status, createdAt: d.createdAt };
}
