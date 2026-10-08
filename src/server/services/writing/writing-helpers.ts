import { and, eq } from "drizzle-orm";
import type { HelperKind } from "@/lib/schemas/writing";
import { askStructured } from "@/server/ai/open-router";
import { HELPER_SCHEMAS, helperSystem, type HelperContent } from "@/server/ai/prompts/writing-helpers";
import { writingTaskBlock } from "@/server/ai/prompts/writing-task";
import type { Db } from "@/server/db/client";
import { writingHelpers } from "@/server/db/schema";
import { chargeCredits, refundCredits } from "@/server/services/credits/credits";
import { loadQuestion, markViewed } from "@/server/services/questions/question-bank";
import { asWritingSubject, usageLogger } from "./writing-common";

export type HelperResult = { kind: HelperKind; content: HelperContent[HelperKind]; cached: boolean };

/** Every helper this student has already asked for on this question (free to view again). */
export async function listHelpers(db: Db, userId: string, questionId: string) {
  const rows = await db
    .select({ kind: writingHelpers.kind, content: writingHelpers.content })
    .from(writingHelpers)
    .where(and(eq(writingHelpers.userId, userId), eq(writingHelpers.questionId, questionId)));
  return Object.fromEntries(rows.map((r) => [r.kind, r.content])) as Partial<HelperContent>;
}

/**
 * Ask AI for 解題 / outline / vocabulary / sentence patterns / idioms. Cached per student and
 * question: asking again is free. Charged before the call and refunded if it fails.
 */
export async function askHelper(db: Db, userId: string, questionId: string, kind: HelperKind): Promise<HelperResult> {
  const q = await loadQuestion(db, userId, questionId);
  const subject = asWritingSubject(q.subject);

  const [existing] = await db
    .select({ content: writingHelpers.content })
    .from(writingHelpers)
    .where(and(eq(writingHelpers.userId, userId), eq(writingHelpers.questionId, questionId), eq(writingHelpers.kind, kind)));
  if (existing) return { kind, content: existing.content as HelperContent[HelperKind], cached: true };

  const charged = await chargeCredits(db, userId, kind === "task_analysis" ? "task_analysis" : "helper");
  let content: HelperContent[HelperKind];
  try {
    content = await askStructured({
      purpose: `writing_helper_${kind}`,
      tier: "light",
      system: helperSystem(kind, subject),
      text: writingTaskBlock(q),
      schema: HELPER_SCHEMAS[kind],
      onUsage: usageLogger(db, userId),
    });
  } catch (e) {
    await refundCredits(db, userId, charged, null);
    throw e;
  }
  await db.insert(writingHelpers).values({ userId, questionId, kind, content }).onConflictDoNothing();
  await markViewed(db, userId, questionId);
  return { kind, content, cached: false };
}
