import { and, asc, desc, eq } from "drizzle-orm";
import type { Subject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";
import {
  attempts,
  criterionStats,
  errorTagStats,
  nextSteps,
  questions,
  rubricCriteria,
  topicMastery,
  topics,
  writingSubmissions,
} from "@/server/db/schema";
import { notFound } from "@/server/errors";

export async function getDashboard(db: Db, userId: string, subject: Subject) {
  const [criteria, tags, mastery, steps, subs, atts] = await Promise.all([
    db
      .select({
        part: criterionStats.part,
        criterion: criterionStats.criterion,
        ewma: criterionStats.ewma,
        attempts: criterionStats.attempts,
        nameEn: rubricCriteria.nameEn,
        nameZh: rubricCriteria.nameZh,
      })
      .from(criterionStats)
      .leftJoin(
        rubricCriteria,
        and(
          eq(rubricCriteria.subject, criterionStats.subject),
          eq(rubricCriteria.part, criterionStats.part),
          eq(rubricCriteria.id, criterionStats.criterion),
        ),
      )
      .where(and(eq(criterionStats.userId, userId), eq(criterionStats.subject, subject))),
    db
      .select({ tag: errorTagStats.tag, weighted: errorTagStats.weighted, total: errorTagStats.total })
      .from(errorTagStats)
      .where(and(eq(errorTagStats.userId, userId), eq(errorTagStats.subject, subject)))
      .orderBy(desc(errorTagStats.weighted))
      .limit(10),
    db
      .select({
        topicId: topicMastery.topicId,
        ewma: topicMastery.ewma,
        attempts: topicMastery.attempts,
        nameEn: topics.nameEn,
        nameZh: topics.nameZh,
        parentId: topics.parentId,
      })
      .from(topicMastery)
      .innerJoin(topics, eq(topics.id, topicMastery.topicId))
      .where(and(eq(topicMastery.userId, userId), eq(topics.subject, subject)))
      .orderBy(asc(topics.sortOrder)),
    db
      .select({ id: nextSteps.id, kind: nextSteps.kind, target: nextSteps.target, rationale: nextSteps.rationale })
      .from(nextSteps)
      .where(and(eq(nextSteps.userId, userId), eq(nextSteps.subject, subject), eq(nextSteps.status, "open")))
      .orderBy(desc(nextSteps.createdAt)),
    db
      .select({ id: writingSubmissions.id, title: questions.title, status: writingSubmissions.status, createdAt: writingSubmissions.createdAt })
      .from(writingSubmissions)
      .innerJoin(questions, eq(questions.id, writingSubmissions.questionId))
      .where(and(eq(writingSubmissions.userId, userId), eq(questions.subject, subject)))
      .orderBy(desc(writingSubmissions.createdAt))
      .limit(5),
    db
      .select({
        id: attempts.id,
        title: questions.title,
        status: attempts.status,
        score: attempts.score,
        maxScore: attempts.maxScore,
        mcCorrect: attempts.mcCorrect,
        createdAt: attempts.createdAt,
      })
      .from(attempts)
      .innerJoin(questions, eq(questions.id, attempts.questionId))
      .where(and(eq(attempts.userId, userId), eq(questions.subject, subject)))
      .orderBy(desc(attempts.createdAt))
      .limit(5),
  ]);

  const recent = [
    ...subs.map((s) => ({ type: "writing" as const, id: s.id, title: s.title, status: s.status, score: null as number | null, maxScore: null as number | null, createdAt: s.createdAt.toISOString(), href: `/writing/submissions/${s.id}` })),
    ...atts.map((a) => ({
      type: "practice" as const,
      id: a.id,
      title: a.title,
      status: a.status,
      score: a.score != null ? Number(a.score) : a.mcCorrect != null ? (a.mcCorrect ? 1 : 0) : null,
      maxScore: a.maxScore != null ? Number(a.maxScore) : a.mcCorrect != null ? 1 : null,
      createdAt: a.createdAt.toISOString(),
      href: `/practice/attempts/${a.id}`,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    criterionStats: criteria.map((c) => ({ ...c, ewma: Number(c.ewma) })),
    errorTags: tags.map((t) => ({ ...t, weighted: Number(t.weighted) })),
    topicMastery: mastery.map((m) => ({ ...m, ewma: Number(m.ewma) })),
    nextSteps: steps,
    recent,
  };
}

export async function setNextStepStatus(db: Db, userId: string, id: string, status: "open" | "done" | "dismissed") {
  const [row] = await db
    .update(nextSteps)
    .set({ status })
    .where(and(eq(nextSteps.id, id), eq(nextSteps.userId, userId)))
    .returning({ id: nextSteps.id, status: nextSteps.status });
  if (!row) throw notFound("Next step not found");
  return row;
}
