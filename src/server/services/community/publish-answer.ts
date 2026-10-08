import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { attempts, profiles, publicAnswers, writingEstimates, writingFeedback, writingScores, writingSubmissions } from "@/server/db/schema";
import { ApiError, forbidden, invalid, notFound } from "@/server/errors";
import { checkPersonalInfo, describePersonalInfo } from "./personal-info-check";
import { loadQuestion } from "../questions/question-bank";

export type PublishInput = { sourceType: "writing" | "attempt"; sourceId: string; includeScore: boolean; includeFeedback: boolean };

type Snapshot = {
  questionId: string;
  body: string;
  scoreSummary: Record<string, unknown> | null;
  feedbackSummary: Record<string, unknown> | null;
};

async function snapshotWriting(db: Db, userId: string, sourceId: string, opts: PublishInput): Promise<Snapshot> {
  const [s] = await db
    .select()
    .from(writingSubmissions)
    .where(and(eq(writingSubmissions.id, sourceId), eq(writingSubmissions.userId, userId)));
  if (!s) throw notFound("Submission not found");
  const body = (s.editedText ?? s.aiText ?? "").trim();
  if (!body) throw invalid("There is no text to share yet.");
  let scoreSummary: Snapshot["scoreSummary"] = null;
  let feedbackSummary: Snapshot["feedbackSummary"] = null;
  if (opts.includeScore) {
    const [est] = await db.select().from(writingEstimates).where(eq(writingEstimates.submissionId, sourceId));
    if (est) {
      const scores = await db.select().from(writingScores).where(eq(writingScores.submissionId, sourceId));
      scoreSummary = {
        level: est.level,
        totalMarks: Number(est.totalMarks),
        maxMarks: Number(est.maxMarks),
        criteria: scores.map((r) => ({ criterion: r.criterion, grade: r.grade, marks: Number(r.marks), maxMarks: Number(r.maxMarks) })),
      };
    }
  }
  if (opts.includeFeedback) {
    const rows = await db.select().from(writingFeedback).where(eq(writingFeedback.submissionId, sourceId));
    const text = (p: Record<string, unknown>) => {
      for (const k of ["text", "comment", "note", "summary", "message"]) if (typeof p[k] === "string") return p[k] as string;
      return Object.values(p).find((v): v is string => typeof v === "string") ?? "";
    };
    feedbackSummary = {
      overall: s.overallComment,
      strengths: rows.filter((r) => r.kind === "strength").map((r) => text(r.payload)).filter(Boolean).slice(0, 5),
    };
  }
  return { questionId: s.questionId, body, scoreSummary, feedbackSummary };
}

async function snapshotAttempt(db: Db, userId: string, sourceId: string, opts: PublishInput): Promise<Snapshot> {
  const [a] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, sourceId), eq(attempts.userId, userId)));
  if (!a) throw notFound("Attempt not found");
  let body = "";
  if (a.editedTranscript?.length) body = a.editedTranscript.map((l) => `$$${l.latex}$$`).join("\n\n");
  else if (a.aiTranscript?.length) body = a.aiTranscript.map((l) => `$$${l.latex}$$`).join("\n\n");
  else if (a.mcChoice) body = `Answer: ${a.mcChoice}`;
  if (!body.trim()) throw invalid("There is no answer to share yet.");
  const scoreSummary =
    opts.includeScore && a.score != null
      ? { score: Number(a.score), maxScore: a.maxScore != null ? Number(a.maxScore) : null, correct: a.mcCorrect }
      : opts.includeScore && a.mcCorrect != null
        ? { correct: a.mcCorrect }
        : null;
  return { questionId: a.questionId, body, scoreSummary, feedbackSummary: null };
}

export async function publishAnswer(db: Db, userId: string, input: PublishInput) {
  const [profile] = await db.select({ nickname: profiles.nickname }).from(profiles).where(eq(profiles.userId, userId));
  if (!profile?.nickname) throw new ApiError(409, "conflict", "Choose a nickname before sharing an answer.", { need: "nickname" });

  const snap = input.sourceType === "writing" ? await snapshotWriting(db, userId, input.sourceId, input) : await snapshotAttempt(db, userId, input.sourceId, input);
  const q = await loadQuestion(db, userId, snap.questionId);
  if (q.ownerId) throw forbidden("Answers to private questions can't be shared.");

  const found = checkPersonalInfo(snap.body);
  if (found.length) {
    throw new ApiError(400, "validation", `Remove personal information before sharing: ${describePersonalInfo(found)}.`, { found });
  }

  const [existing] = await db.select().from(publicAnswers).where(eq(publicAnswers.sourceId, input.sourceId));
  if (existing && (existing.status === "hidden_reported" || existing.status === "removed")) {
    throw forbidden("This answer was hidden after reports and can't be republished.");
  }
  const values = {
    userId,
    questionId: snap.questionId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    body: snap.body,
    includeScore: input.includeScore,
    includeFeedback: input.includeFeedback,
    scoreSummary: snap.scoreSummary,
    feedbackSummary: snap.feedbackSummary,
    status: "published",
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(publicAnswers)
    .values(values)
    .onConflictDoUpdate({ target: publicAnswers.sourceId, set: { ...values, publishedAt: new Date() } })
    .returning();
  await setSourceVisibility(db, input.sourceType, input.sourceId, "public");
  return summarize(row);
}

export async function setSourceVisibility(db: Db, sourceType: string, sourceId: string, visibility: "public" | "private") {
  if (sourceType === "writing") await db.update(writingSubmissions).set({ visibility }).where(eq(writingSubmissions.id, sourceId));
  else await db.update(attempts).set({ visibility }).where(eq(attempts.id, sourceId));
}

export const summarize = (r: typeof publicAnswers.$inferSelect) => ({
  id: r.id,
  sourceType: r.sourceType,
  sourceId: r.sourceId,
  status: r.status,
  includeScore: r.includeScore,
  includeFeedback: r.includeFeedback,
});

/** The viewer's own published-answer record for a source (to show the publish state). */
export async function answerBySource(db: Db, userId: string, sourceId: string) {
  const [r] = await db.select().from(publicAnswers).where(and(eq(publicAnswers.sourceId, sourceId), eq(publicAnswers.userId, userId)));
  return r ? summarize(r) : null;
}

export async function updateAnswer(
  db: Db,
  userId: string,
  answerId: string,
  patch: { visibility: "private" } | { republish: true; includeScore?: boolean; includeFeedback?: boolean },
) {
  const [a] = await db.select().from(publicAnswers).where(and(eq(publicAnswers.id, answerId), eq(publicAnswers.userId, userId)));
  if (!a) throw notFound("Answer not found");
  if ("visibility" in patch) {
    const [row] = await db
      .update(publicAnswers)
      .set({ status: a.status === "published" ? "hidden_by_owner" : a.status, updatedAt: new Date() })
      .where(eq(publicAnswers.id, answerId))
      .returning();
    await setSourceVisibility(db, a.sourceType, a.sourceId, "private");
    return summarize(row);
  }
  return publishAnswer(db, userId, {
    sourceType: a.sourceType as "writing" | "attempt",
    sourceId: a.sourceId,
    includeScore: patch.includeScore ?? a.includeScore,
    includeFeedback: patch.includeFeedback ?? a.includeFeedback,
  });
}
