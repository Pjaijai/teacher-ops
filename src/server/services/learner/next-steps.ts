import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { isWritingSubject, type Subject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";
import { criterionStats, errorTagStats, nextSteps, topicMastery, topics } from "@/server/db/schema";

/**
 * Rebuild the open next steps for one subject from the profile (simple rules):
 * weakest criterion → revise; top error tag → helper (writing) or question (practice);
 * weakest topic with ≥ 2 attempts → topic practice. Done and dismissed steps are kept.
 */
export async function regenerateNextSteps(db: Db, userId: string, subject: Subject) {
  const steps: { kind: string; target: Record<string, unknown>; rationale: string }[] = [];
  const writing = isWritingSubject(subject);

  if (writing) {
    const [weak] = await db
      .select()
      .from(criterionStats)
      .where(and(eq(criterionStats.userId, userId), eq(criterionStats.subject, subject)))
      .orderBy(asc(criterionStats.ewma))
      .limit(1);
    if (weak && Number(weak.ewma) < 0.85) {
      steps.push({
        kind: "revise",
        target: { href: "/writing", subject, part: weak.part, criterion: weak.criterion, ewma: Number(weak.ewma) },
        rationale: `Your weakest criterion is ${weak.criterion}. Revise your last piece with it in mind.`,
      });
    }
  }

  const [tag] = await db
    .select()
    .from(errorTagStats)
    .where(and(eq(errorTagStats.userId, userId), eq(errorTagStats.subject, subject)))
    .orderBy(desc(errorTagStats.weighted))
    .limit(1);
  if (tag && Number(tag.weighted) >= 1.5) {
    steps.push({
      kind: writing ? "helper" : "question",
      target: { href: writing ? "/writing" : `/practice?subject=${subject}`, subject, tag: tag.tag, weighted: Number(tag.weighted) },
      rationale: `"${tag.tag}" keeps coming up. ${writing ? "Use the vocabulary and sentence helpers on your next task." : "Practise a question that targets it."}`,
    });
  }

  if (!writing) {
    const rows = await db
      .select({ topicId: topicMastery.topicId, ewma: topicMastery.ewma, attempts: topicMastery.attempts })
      .from(topicMastery)
      .innerJoin(topics, eq(topics.id, topicMastery.topicId))
      .where(and(eq(topicMastery.userId, userId), eq(topics.subject, subject)))
      .orderBy(asc(topicMastery.ewma));
    const weak = rows.find((r) => r.attempts >= 2 && Number(r.ewma) < 0.7);
    if (weak) {
      steps.push({
        kind: "topic",
        target: { href: `/practice?topic=${weak.topicId}`, subject, topicId: weak.topicId, ewma: Number(weak.ewma) },
        rationale: `Practise ${weak.topicId}: your mastery is ${Math.round(Number(weak.ewma) * 100)}%.`,
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(nextSteps).where(and(eq(nextSteps.userId, userId), eq(nextSteps.subject, subject), inArray(nextSteps.status, ["open"])));
    if (steps.length) await tx.insert(nextSteps).values(steps.map((s) => ({ ...s, userId, subject })));
  });
}
