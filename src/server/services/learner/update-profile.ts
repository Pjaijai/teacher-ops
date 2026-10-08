import { and, eq, sql } from "drizzle-orm";
import type { Subject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";
import { criterionStats, errorTagStats, topicMastery } from "@/server/db/schema";
import { registerLearnerHandlers, type AttemptResult, type WritingResult } from "./learner-events";
import { regenerateNextSteps } from "./next-steps";

export const EWMA_ALPHA = 0.35;
export const TAG_DECAY = 0.8;

export const ewma = (prev: number | null, value: number) => (prev == null ? value : EWMA_ALPHA * value + (1 - EWMA_ALPHA) * prev);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Decay existing tag weights once per new submission in the subject, then add this submission's occurrences. */
async function updateErrorTags(db: Db, userId: string, subject: Subject, tags: string[]) {
  const now = new Date();
  await db
    .update(errorTagStats)
    .set({ weighted: sql`${errorTagStats.weighted} * ${TAG_DECAY}` })
    .where(and(eq(errorTagStats.userId, userId), eq(errorTagStats.subject, subject)));
  const counts = new Map<string, number>();
  for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [tag, n] of counts) {
    await db
      .insert(errorTagStats)
      .values({ userId, subject, tag, weighted: String(n), total: n, lastAt: now })
      .onConflictDoUpdate({
        target: [errorTagStats.userId, errorTagStats.subject, errorTagStats.tag],
        set: { weighted: sql`${errorTagStats.weighted} + ${n}`, total: sql`${errorTagStats.total} + ${n}`, lastAt: now },
      });
  }
}

async function onWriting(db: Db, r: WritingResult) {
  const now = new Date();
  for (const [criterion, raw] of Object.entries(r.criterionScores)) {
    const value = clamp01(raw);
    const [old] = await db
      .select()
      .from(criterionStats)
      .where(
        and(
          eq(criterionStats.userId, r.userId),
          eq(criterionStats.subject, r.subject),
          eq(criterionStats.part, r.part),
          eq(criterionStats.criterion, criterion),
        ),
      );
    const next = ewma(old ? Number(old.ewma) : null, value);
    await db
      .insert(criterionStats)
      .values({ userId: r.userId, subject: r.subject, part: r.part, criterion, ewma: String(next), attempts: 1, lastAt: now })
      .onConflictDoUpdate({
        target: [criterionStats.userId, criterionStats.subject, criterionStats.part, criterionStats.criterion],
        set: { ewma: String(next), attempts: sql`${criterionStats.attempts} + 1`, lastAt: now },
      });
  }
  await updateErrorTags(db, r.userId, r.subject, r.errorTags);
  await regenerateNextSteps(db, r.userId, r.subject);
}

async function onAttempt(db: Db, r: AttemptResult) {
  const now = new Date();
  const value = clamp01(r.fraction);
  for (const topicId of new Set(r.topicIds)) {
    const [old] = await db
      .select()
      .from(topicMastery)
      .where(and(eq(topicMastery.userId, r.userId), eq(topicMastery.topicId, topicId)));
    const next = ewma(old ? Number(old.ewma) : null, value);
    await db
      .insert(topicMastery)
      .values({ userId: r.userId, topicId, ewma: String(next), attempts: 1, lastAt: now })
      .onConflictDoUpdate({
        target: [topicMastery.userId, topicMastery.topicId],
        set: { ewma: String(next), attempts: sql`${topicMastery.attempts} + 1`, lastAt: now },
      });
  }
  await updateErrorTags(db, r.userId, r.subject, r.errorTags);
  await regenerateNextSteps(db, r.userId, r.subject);
}

registerLearnerHandlers({ writing: onWriting, attempt: onAttempt });
