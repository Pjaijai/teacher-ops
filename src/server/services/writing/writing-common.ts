import { and, eq } from "drizzle-orm";
import { stripMarkers } from "@/features/writing/lib/text-markers";
import type { UsageSink } from "@/server/ai/open-router";
import type { Db } from "@/server/db/client";
import { aiRuns, questions, writingSubmissions } from "@/server/db/schema";
import { invalid, notFound } from "@/server/errors";

export type WritingSubject = "chi_writing" | "eng_writing";
export type Question = typeof questions.$inferSelect;
export type Submission = typeof writingSubmissions.$inferSelect;

export function asWritingSubject(subject: string): WritingSubject {
  if (subject !== "chi_writing" && subject !== "eng_writing") throw invalid("This is not a writing question.");
  return subject;
}

/**
 * Canonical paper part: "A" (Chinese 甲部 / English Part A) or "B" (乙部 / Part B). Stored in
 * writing_scores.part and the learner profile; the UI shows 甲部/乙部 for Chinese.
 */
export function canonicalPart(q: Pick<Question, "part" | "content">): "A" | "B" {
  const p = (q.content.writing?.part ?? q.part ?? "").trim();
  return p === "甲部" || p.toUpperCase() === "A" ? "A" : "B";
}

export const displayPart = (subject: WritingSubject, part: "A" | "B") =>
  subject === "chi_writing" ? (part === "A" ? "甲部" : "乙部") : part;

/** Chinese 甲部 gets feedback only (SPEC: no DSE estimate). */
export const estimateAllowed = (subject: WritingSubject, part: "A" | "B") => !(subject === "chi_writing" && part === "A");

/** The student's own submission, or 404 (never reveal other students' work). */
export async function loadOwnSubmission(db: Db, userId: string, id: string): Promise<Submission> {
  const [s] = await db
    .select()
    .from(writingSubmissions)
    .where(and(eq(writingSubmissions.id, id), eq(writingSubmissions.userId, userId)));
  if (!s) throw notFound("Submission not found");
  return s;
}

/** The question behind a submission (the student may have lost access to the bank copy; their work stays readable). */
export async function loadSubmissionQuestion(db: Db, s: Submission): Promise<Question> {
  const [q] = await db.select().from(questions).where(eq(questions.id, s.questionId));
  if (!q) throw notFound("Question not found");
  return q;
}

/** The text the feedback is about: the student's edited text (or the AI reading), markers stripped. */
export function essayText(s: Pick<Submission, "editedText" | "aiText">) {
  return stripMarkers(s.editedText ?? s.aiText ?? "");
}

/** Log a synchronous (non-job) model call against the student. */
export function usageLogger(db: Db, userId: string): UsageSink {
  return async (purpose, u) => {
    await db.insert(aiRuns).values({
      userId,
      jobId: null,
      purpose,
      model: u.model,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      costUsd: u.costUsd?.toFixed(6) ?? null,
      latencyMs: u.latencyMs,
    });
  };
}
