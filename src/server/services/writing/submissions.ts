import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { stripMarkers, textLength } from "@/features/writing/lib/text-markers";
import { CREDIT_COSTS } from "@/lib/credits";
import type { Db } from "@/server/db/client";
import {
  jobs,
  levelSamples,
  questions,
  submissionPages,
  writingEstimates,
  writingFeedback,
  writingScores,
  writingSubmissions,
} from "@/server/db/schema";
import { ApiError, forbidden, invalid } from "@/server/errors";
import { startJob } from "@/server/jobs/job-runner";
import { chargeCredits, creditBalance, refundCredits } from "@/server/services/credits/credits";
import { loadQuestion, markViewed, saveQuestion, toPublic } from "@/server/services/questions/question-bank";
import { ownsKey } from "@/server/storage/storage";
import { defaultTargetLevel } from "./level-sample";
import { trackEdits } from "./track-edits";
import {
  asWritingSubject,
  canonicalPart,
  displayPart,
  estimateAllowed,
  loadOwnSubmission,
  loadSubmissionQuestion,
  type Submission,
} from "./writing-common";
import { listHelpers } from "./writing-helpers";
import { DEFAULT_WORD_LIMIT, partTopicId, writingContent } from "./writing-task-content";

const MIN_CHARS = 20;

// ---------------------------------------------------------------- tasks

/** The task page: the question (student view), cached helpers and this student's submissions on it. */
export async function getTaskView(db: Db, userId: string, questionId: string) {
  const q = await loadQuestion(db, userId, questionId);
  const subject = asWritingSubject(q.subject);
  const part = canonicalPart(q);
  await markViewed(db, userId, questionId);
  return {
    question: toPublic(q),
    part,
    estimateAllowed: estimateAllowed(subject, part),
    helpers: await listHelpers(db, userId, questionId),
    submissions: await listSubmissions(db, userId, questionId),
  };
}

/** "My own question": a private writing task (only this student can see it; answers can't be made public). */
export async function createOwnPrompt(
  db: Db,
  userId: string,
  input: { subject: "chi_writing" | "eng_writing"; part: "A" | "B"; text: string; materials?: string | null; title?: string | null; textType?: string | null },
) {
  const part = displayPart(input.subject, input.part);
  const firstLine = input.text.trim().split("\n")[0].replace(/^#+\s*/, "");
  const title = (input.title?.trim() || firstLine).slice(0, 80);
  return saveQuestion(db, {
    subject: input.subject,
    kind: "writing_task",
    language: input.subject === "chi_writing" ? "zh" : "en",
    title,
    topicIds: [partTopicId(input.subject, input.part)],
    part,
    content: writingContent({
      stem: input.text.trim(),
      materials: input.materials?.trim() || null,
      part,
      genre: null,
      textType: input.textType?.trim() || null,
      wordLimit: DEFAULT_WORD_LIMIT[input.subject][input.part],
    }),
    checkProblems: [],
    ownerId: userId,
    origin: "own_prompt",
  });
}

// ---------------------------------------------------------------- submissions

export async function listSubmissions(db: Db, userId: string, questionId?: string) {
  const rows = await db
    .select({
      id: writingSubmissions.id,
      questionId: writingSubmissions.questionId,
      status: writingSubmissions.status,
      inputMode: writingSubmissions.inputMode,
      charCount: writingSubmissions.charCount,
      visibility: writingSubmissions.visibility,
      parentSubmissionId: writingSubmissions.parentSubmissionId,
      createdAt: writingSubmissions.createdAt,
      submittedAt: writingSubmissions.submittedAt,
      title: questions.title,
      subject: questions.subject,
      part: questions.part,
      level: writingEstimates.level,
    })
    .from(writingSubmissions)
    .innerJoin(questions, eq(questions.id, writingSubmissions.questionId))
    .leftJoin(writingEstimates, eq(writingEstimates.submissionId, writingSubmissions.id))
    .where(and(eq(writingSubmissions.userId, userId), questionId ? eq(writingSubmissions.questionId, questionId) : undefined))
    .orderBy(desc(writingSubmissions.createdAt))
    .limit(50);
  return rows;
}

/** Start a submission: typed text goes straight to review; photos are transcribed in a job. */
export async function createSubmission(
  db: Db,
  userId: string,
  input: { questionId: string; inputMode: "typed" | "photo"; text?: string; uploadKeys?: string[]; parentSubmissionId?: string },
): Promise<{ submissionId: string; jobId: string | null }> {
  const q = await loadQuestion(db, userId, input.questionId);
  const subject = asWritingSubject(q.subject);

  if (input.parentSubmissionId) {
    const parent = await loadOwnSubmission(db, userId, input.parentSubmissionId);
    if (parent.questionId !== q.id) throw invalid("A revision must answer the same question.");
  }

  if (input.inputMode === "typed") {
    const text = (input.text ?? "").trim();
    if (textLength(text, subject) < (subject === "chi_writing" ? MIN_CHARS : 10)) throw invalid("Please write a little more before submitting.");
    const [row] = await db
      .insert(writingSubmissions)
      .values({
        userId,
        questionId: q.id,
        status: "review",
        inputMode: "typed",
        editedText: text,
        charCount: textLength(stripMarkers(text).clean, subject),
        parentSubmissionId: input.parentSubmissionId ?? null,
      })
      .returning({ id: writingSubmissions.id });
    await markViewed(db, userId, q.id);
    return { submissionId: row.id, jobId: null };
  }

  const keys = input.uploadKeys ?? [];
  if (keys.length === 0) throw invalid("Add at least one photo.");
  if (keys.some((k) => !ownsKey(userId, k))) throw forbidden("That photo isn't yours.");

  const credits = await chargeCredits(db, userId, "transcribe_page", { units: keys.length });
  try {
    const [row] = await db
      .insert(writingSubmissions)
      .values({ userId, questionId: q.id, status: "transcribing", inputMode: "photo", parentSubmissionId: input.parentSubmissionId ?? null })
      .returning({ id: writingSubmissions.id });
    await db.insert(submissionPages).values(keys.map((storageKey, i) => ({ submissionId: row.id, pageNo: i + 1, storageKey })));
    await markViewed(db, userId, q.id);
    const jobId = await startJob(db, { userId, kind: "transcribe_writing", resourceRef: row.id, input: { submissionId: row.id }, credits });
    return { submissionId: row.id, jobId };
  } catch (e) {
    await refundCredits(db, userId, credits, null);
    throw e;
  }
}

/** Transcription failed (credits were refunded): try again. */
export async function retryTranscription(db: Db, userId: string, id: string) {
  const s = await loadOwnSubmission(db, userId, id);
  if (s.inputMode !== "photo" || s.status !== "transcribe_failed") throw new ApiError(409, "conflict", "This submission isn't waiting for a transcription.");
  const pages = await db.select().from(submissionPages).where(eq(submissionPages.submissionId, id));
  const credits = await chargeCredits(db, userId, "transcribe_page", { units: pages.length });
  try {
    await db.update(writingSubmissions).set({ status: "transcribing" }).where(eq(writingSubmissions.id, id));
    return await startJob(db, { userId, kind: "transcribe_writing", resourceRef: id, input: { submissionId: id }, credits });
  } catch (e) {
    await refundCredits(db, userId, credits, null);
    throw e;
  }
}

/** The student's corrections to the transcript (or their typed text). Tracked against the AI reading. */
export async function updateText(db: Db, userId: string, id: string, editedText: string) {
  const s = await loadOwnSubmission(db, userId, id);
  if (s.status !== "review") throw new ApiError(409, "conflict", "This submission can no longer be edited.");
  const q = await loadSubmissionQuestion(db, s);
  const subject = asWritingSubject(q.subject);
  const edited = stripMarkers(editedText).clean;
  const edits = s.aiText ? trackEdits(stripMarkers(s.aiText).clean, edited) : [];
  await db
    .update(writingSubmissions)
    .set({ editedText, edits, charCount: textLength(edited, subject) })
    .where(eq(writingSubmissions.id, id));
  return { edits, charCount: textLength(edited, subject) };
}

/** Submit for feedback (8 credits) and, optionally, the DSE estimate (+5; not for Chinese 甲部). */
export async function submitForFeedback(db: Db, userId: string, id: string, wantsEstimate: boolean) {
  const s = await loadOwnSubmission(db, userId, id);
  if (s.status !== "review") throw new ApiError(409, "conflict", "This submission has already been submitted.");
  const q = await loadSubmissionQuestion(db, s);
  const subject = asWritingSubject(q.subject);
  if (wantsEstimate && !estimateAllowed(subject, canonicalPart(q))) {
    throw invalid("Chinese 甲部 gets feedback only, without a DSE estimate.");
  }
  const text = stripMarkers(s.editedText ?? s.aiText ?? "").clean;
  if (textLength(text, subject) < (subject === "chi_writing" ? MIN_CHARS : 10)) throw invalid("There's not enough text to give feedback on.");

  const cost = CREDIT_COSTS.writing_feedback + (wantsEstimate ? CREDIT_COSTS.dse_estimate : 0);
  const { balance } = await creditBalance(db, userId);
  if (balance < cost) throw new ApiError(402, "credits", "Not enough credits today.", { balance, cost });
  let charged = await chargeCredits(db, userId, "writing_feedback");
  try {
    if (wantsEstimate) charged += await chargeCredits(db, userId, "dse_estimate");
    await db
      .update(writingSubmissions)
      .set({ status: "grading", wantsEstimate, submittedAt: new Date() })
      .where(eq(writingSubmissions.id, id));
    return await startJob(db, { userId, kind: "writing_feedback", resourceRef: id, input: { submissionId: id, wantsEstimate }, credits: charged });
  } catch (e) {
    await refundCredits(db, userId, charged, null);
    await db.update(writingSubmissions).set({ status: "review" }).where(eq(writingSubmissions.id, id));
    throw e;
  }
}

/** Level sample (10 credits): default target = estimate + 1, or Level 4 without an estimate. */
export async function requestSample(db: Db, userId: string, id: string, targetLevel?: number) {
  const s = await loadOwnSubmission(db, userId, id);
  if (s.status !== "graded") throw new ApiError(409, "conflict", "Get feedback first, then ask for a level sample.");
  const [est] = await db.select({ level: writingEstimates.level }).from(writingEstimates).where(eq(writingEstimates.submissionId, id));
  const target = targetLevel ?? defaultTargetLevel(est?.level ?? null);
  const credits = await chargeCredits(db, userId, "level_sample");
  try {
    return await startJob(db, { userId, kind: "level_sample", resourceRef: id, input: { submissionId: id, targetLevel: target }, credits });
  } catch (e) {
    await refundCredits(db, userId, credits, null);
    throw e;
  }
}

/** Everything the review / feedback page needs, for the owner only. */
export async function getSubmissionView(db: Db, userId: string, id: string) {
  const s = await loadOwnSubmission(db, userId, id);
  const q = await loadSubmissionQuestion(db, s);
  const subject = asWritingSubject(q.subject);
  const part = canonicalPart(q);
  const stripped = stripMarkers(s.editedText ?? s.aiText ?? "");

  const [pages, feedback, scores, estimate, samples, activeJobs, children] = await Promise.all([
    db.select().from(submissionPages).where(eq(submissionPages.submissionId, id)).orderBy(asc(submissionPages.pageNo)),
    db.select().from(writingFeedback).where(eq(writingFeedback.submissionId, id)),
    db.select().from(writingScores).where(eq(writingScores.submissionId, id)),
    db.select().from(writingEstimates).where(eq(writingEstimates.submissionId, id)),
    db.select().from(levelSamples).where(eq(levelSamples.submissionId, id)).orderBy(desc(levelSamples.createdAt)),
    db
      .select({ id: jobs.id, kind: jobs.kind })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.resourceRef, id), inArray(jobs.status, ["queued", "running"])))
      .orderBy(desc(jobs.createdAt))
      .limit(1),
    db
      .select({ id: writingSubmissions.id, status: writingSubmissions.status, createdAt: writingSubmissions.createdAt })
      .from(writingSubmissions)
      .where(and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.parentSubmissionId, id))),
  ]);

  return {
    submission: publicSubmission(s),
    subject,
    part,
    estimateAllowed: estimateAllowed(subject, part),
    question: toPublic(q),
    cleanText: stripped.clean,
    markers: { unsure: stripped.unsure, insertions: stripped.insertions, malformed: stripped.malformed },
    pages: pages.map((p) => ({ pageNo: p.pageNo, key: p.storageKey })),
    feedback: feedback
      .map((f) => ({ id: f.id, kind: f.kind, startPos: f.startPos, endPos: f.endPos, payload: f.payload, tags: f.tags, criterion: f.criterion }))
      .sort((a, b) => (a.startPos ?? Infinity) - (b.startPos ?? Infinity)),
    scores: scores.map((r) => ({ criterion: r.criterion, part: r.part, grade: r.grade, marks: Number(r.marks), maxMarks: Number(r.maxMarks), reason: r.reason })),
    estimate: estimate[0]
      ? { totalMarks: Number(estimate[0].totalMarks), maxMarks: Number(estimate[0].maxMarks), level: estimate[0].level, levelReason: estimate[0].levelReason }
      : null,
    samples: samples.map((x) => ({ id: x.id, targetLevel: x.targetLevel, text: x.text, changes: x.changes, createdAt: x.createdAt })),
    activeJob: activeJobs[0] ?? null,
    revisions: children,
  };
}

function publicSubmission(s: Submission) {
  return {
    id: s.id,
    questionId: s.questionId,
    status: s.status as "draft" | "transcribing" | "transcribe_failed" | "review" | "grading" | "graded",
    inputMode: s.inputMode as "typed" | "photo",
    wantsEstimate: s.wantsEstimate,
    aiText: s.aiText,
    editedText: s.editedText,
    edits: s.edits,
    dominantScript: s.dominantScript as "trad" | "simp" | null,
    charCount: s.charCount,
    visibility: s.visibility,
    parentSubmissionId: s.parentSubmissionId,
    createdAt: s.createdAt,
    submittedAt: s.submittedAt,
  };
}
