"use client";

import { getLocalJob, startAiJob } from "@/features/jobs/local-jobs";
import { recordWritingResult } from "@/features/local/learner";
import {
  getHelpers,
  getQuestion,
  getSubmission,
  imagesForAi,
  listSubmissions,
  localId,
  nowIso,
  putSubmission,
  saveHelper,
  saveImages,
  saveQuestion,
  type Estimate,
  type FeedbackRow,
  type LocalQuestion,
  type LocalSubmission,
} from "@/features/local/local-db";
import type { QuestionLite } from "@/lib/schemas/ai";
import type { QuestionPublic } from "@/lib/schemas/question";
import type { HelperKind } from "@/lib/schemas/writing";
import { trackEdits } from "@/server/services/writing/track-edits";
import { stripMarkers, textLength } from "./text-markers";
import {
  canonicalPart,
  defaultTargetLevel,
  DEFAULT_WORD_LIMIT,
  displayPart,
  estimateAllowed,
  minLength,
  partTopicId,
  writingContent,
  type WritingSubject,
} from "./writing-task";

/**
 * Local mode writing: the same views the cloud API returns, built from IndexedDB, and the long AI
 * calls (/api/ai/writing/*) run as in-tab jobs. A submission left "transcribing"/"grading" without a
 * live job (the tab was reloaded) is treated as interrupted and handed back to the student.
 */

/** Live in-tab job per submission (transcribe, feedback or level sample). */
const activeJobs = new Map<string, { id: string; kind: "transcribe_writing" | "writing_feedback" | "level_sample" }>();

function liveJob(submissionId: string) {
  const a = activeJobs.get(submissionId);
  if (!a) return null;
  const job = getLocalJob(a.id);
  return job && (job.status === "queued" || job.status === "running") ? a : null;
}

export class LocalWritingError extends Error {}

const asSubject = (s: string): WritingSubject => {
  if (s !== "chi_writing" && s !== "eng_writing") throw new LocalWritingError("This is not a writing question.");
  return s;
};

export const toLite = (q: LocalQuestion): QuestionLite => ({
  subject: q.subject,
  kind: q.kind,
  title: q.title,
  part: q.part,
  language: q.language,
  topicIds: q.topicIds,
  content: q.content,
});

function toPublic(q: LocalQuestion): QuestionPublic {
  const c = q.content;
  return {
    id: q.id,
    subject: q.subject,
    kind: q.kind,
    title: q.title,
    language: q.language,
    topicIds: q.topicIds,
    part: q.part,
    difficulty: q.difficulty,
    extension: q.extension,
    isPrivate: false, // everything is private to this device in local mode
    rating: { up: q.rating === 1 ? 1 : 0, down: q.rating === -1 ? 1 : 0 },
    content: { stem: c.stem, materials: c.materials, figure: c.figure, graph: c.graph, options: c.options, writing: c.writing },
  };
}

async function loadQuestion(id: string) {
  const q = await getQuestion(id);
  if (!q) throw new LocalWritingError("Question not found");
  return q;
}

async function loadSubmission(id: string) {
  const s = await getSubmission(id);
  if (!s) throw new LocalWritingError("Submission not found");
  return settle(s);
}

/** Hand back work whose job died with the tab: transcribing → transcribe_failed, grading → review. */
async function settle(s: LocalSubmission) {
  if ((s.status === "transcribing" || s.status === "grading") && !liveJob(s.id)) {
    const next: LocalSubmission = { ...s, status: s.status === "transcribing" ? "transcribe_failed" : "review", submittedAt: s.status === "grading" ? null : s.submittedAt };
    await putSubmission(next);
    return next;
  }
  return s;
}

// ---------------------------------------------------------------- tasks

export async function createGeneratedTaskJob(input: { subject: WritingSubject; topicIds: string[]; part: string }, onSaved?: () => void) {
  return startAiJob<{ question: Omit<LocalQuestion, "id" | "createdAt" | "rating" | "origin"> }>({
    path: "questions/generate",
    body: {
      subject: input.subject,
      kind: "writing_task",
      topicIds: input.topicIds,
      part: input.part,
      language: input.subject === "chi_writing" ? "zh" : "en",
      difficulty: 3,
      extension: false,
      forceNew: true,
    },
    kind: "generate_question",
    resourceRef: input.subject,
    onResult: async ({ question }) => {
      const row = await saveQuestion({ ...question, origin: "bank" });
      onSaved?.();
      return { questionId: row.id };
    },
  });
}

export async function createOwnPrompt(input: { subject: WritingSubject; part: "A" | "B"; text: string; materials?: string | null; title?: string | null; textType?: string | null }) {
  const text = input.text.trim();
  if (text.length < 5) throw new LocalWritingError("Please paste the full task.");
  const part = displayPart(input.subject, input.part);
  const firstLine = text.split("\n")[0].replace(/^#+\s*/, "");
  const row = await saveQuestion({
    subject: input.subject,
    kind: "writing_task",
    language: input.subject === "chi_writing" ? "zh" : "en",
    title: (input.title?.trim() || firstLine).slice(0, 80),
    topicIds: [partTopicId(input.subject, input.part)],
    part,
    difficulty: 3,
    extension: false,
    content: writingContent({
      stem: text,
      materials: input.materials?.trim() || null,
      part,
      genre: null,
      textType: input.textType?.trim() || null,
      wordLimit: DEFAULT_WORD_LIMIT[input.subject][input.part],
    }),
    checkProblems: [],
    origin: "own_prompt",
  });
  return { questionId: row.id };
}

export async function getTaskView(questionId: string) {
  const q = await loadQuestion(questionId);
  const subject = asSubject(q.subject);
  const part = canonicalPart(q);
  return {
    question: toPublic(q),
    part,
    estimateAllowed: estimateAllowed(subject, part),
    helpers: await getHelpers(questionId),
    submissions: (await listSubmissionRows(questionId)).items,
  };
}

/** Cached helper, or ask the AI once and keep the answer on this device. */
export async function askHelper(questionId: string, kind: HelperKind, callAi: <T>(path: string, body: unknown) => Promise<T>) {
  const cached = (await getHelpers(questionId))[kind];
  if (cached) return { kind, content: cached, cached: true };
  const q = await loadQuestion(questionId);
  const res = await callAi<{ kind: HelperKind; content: unknown }>("writing/helper", { question: toLite(q), kind });
  await saveHelper(questionId, kind, res.content);
  return { kind, content: res.content, cached: false };
}

// ---------------------------------------------------------------- submissions

export async function listSubmissionRows(questionId?: string) {
  const rows = await Promise.all((await listSubmissions(questionId)).slice(0, 50).map(settle));
  const questions = new Map<string, LocalQuestion | undefined>();
  for (const s of rows) if (!questions.has(s.questionId)) questions.set(s.questionId, await getQuestion(s.questionId));
  return {
    items: rows.map((s) => {
      const q = questions.get(s.questionId);
      return {
        id: s.id,
        questionId: s.questionId,
        status: s.status as string,
        inputMode: s.inputMode as string,
        charCount: s.charCount,
        visibility: "private" as const,
        parentSubmissionId: s.parentSubmissionId,
        createdAt: s.createdAt,
        submittedAt: s.submittedAt,
        title: q?.title ?? "—",
        subject: (q?.subject ?? "chi_writing") as WritingSubject,
        part: q?.part ?? null,
        level: s.estimate?.level ?? null,
      };
    }),
  };
}

/**
 * Start reading the photos. The job is registered before the "transcribing" status is saved, so a
 * refetch never mistakes this submission for an interrupted one.
 */
async function startTranscription(s: LocalSubmission, subject: WritingSubject, onChange: () => void) {
  const images = await imagesForAi(s.imageIds);
  const jobId = startAiJob<{ text: string; charCount: number }>({
    path: "writing/transcribe",
    body: { subject, images },
    kind: "transcribe_writing",
    resourceRef: s.id,
    onResult: async ({ text, charCount }) => {
      const cur = (await getSubmission(s.id)) ?? s;
      await putSubmission({ ...cur, status: "review", aiText: text, editedText: text, edits: [], charCount });
      onChange();
      return { submissionId: s.id };
    },
    onError: async () => {
      const cur = (await getSubmission(s.id)) ?? s;
      await putSubmission({ ...cur, status: "transcribe_failed" });
      onChange();
    },
  });
  activeJobs.set(s.id, { id: jobId, kind: "transcribe_writing" });
  await putSubmission({ ...s, status: "transcribing" });
  return jobId;
}

export async function createSubmission(
  input: { questionId: string; inputMode: "typed" | "photo"; text?: string; files?: Blob[]; parentSubmissionId?: string },
  onChange: () => void,
) {
  const q = await loadQuestion(input.questionId);
  const subject = asSubject(q.subject);
  if (input.parentSubmissionId) {
    const parent = await getSubmission(input.parentSubmissionId);
    if (!parent || parent.questionId !== q.id) throw new LocalWritingError("A revision must answer the same question.");
  }
  const base: LocalSubmission = {
    id: localId("ws"),
    questionId: q.id,
    status: "review",
    inputMode: input.inputMode,
    wantsEstimate: false,
    imageIds: [],
    aiText: null,
    editedText: null,
    edits: [],
    dominantScript: null,
    charCount: null,
    overallComment: null,
    feedback: [],
    estimate: null,
    samples: [],
    parentSubmissionId: input.parentSubmissionId ?? null,
    createdAt: nowIso(),
    submittedAt: null,
  };

  if (input.inputMode === "typed") {
    const text = (input.text ?? "").trim();
    if (textLength(text, subject) < minLength(subject)) throw new LocalWritingError("Please write a little more before submitting.");
    await putSubmission({ ...base, editedText: text, charCount: textLength(stripMarkers(text).clean, subject) });
    return { submissionId: base.id, jobId: null };
  }

  const files = input.files ?? [];
  if (files.length === 0) throw new LocalWritingError("Add at least one photo.");
  const s: LocalSubmission = { ...base, status: "transcribe_failed", imageIds: await saveImages(files) };
  await putSubmission(s); // kept as failed (retryable) if reading the photos throws before the job starts
  return { submissionId: s.id, jobId: await startTranscription(s, subject, onChange) };
}

export async function retryTranscription(id: string, onChange: () => void) {
  const s = await loadSubmission(id);
  if (s.inputMode !== "photo" || s.status !== "transcribe_failed") throw new LocalWritingError("This submission isn't waiting for a transcription.");
  const q = await loadQuestion(s.questionId);
  return { jobId: await startTranscription(s, asSubject(q.subject), onChange) };
}

export async function updateText(id: string, editedText: string) {
  const s = await loadSubmission(id);
  if (s.status !== "review") throw new LocalWritingError("This submission can no longer be edited.");
  const q = await loadQuestion(s.questionId);
  const subject = asSubject(q.subject);
  const edited = stripMarkers(editedText).clean;
  const edits = s.aiText ? trackEdits(stripMarkers(s.aiText).clean, edited) : [];
  const charCount = textLength(edited, subject);
  await putSubmission({ ...s, editedText, edits, charCount });
  return { edits, charCount };
}

type FeedbackResult = {
  rows: Omit<FeedbackRow, "id">[];
  estimate: Estimate | null;
  dominantScript: "trad" | "simp" | null;
  charCount: number;
  overallComment: string | null;
};

export async function submitForFeedback(id: string, wantsEstimate: boolean, onChange: () => void) {
  const s = await loadSubmission(id);
  if (s.status !== "review") throw new LocalWritingError("This submission has already been submitted.");
  const q = await loadQuestion(s.questionId);
  const subject = asSubject(q.subject);
  const part = canonicalPart(q);
  if (wantsEstimate && !estimateAllowed(subject, part)) throw new LocalWritingError("Chinese 甲部 gets feedback only, without a DSE estimate.");
  const text = s.editedText ?? s.aiText ?? "";
  if (textLength(stripMarkers(text).clean, subject) < minLength(subject)) throw new LocalWritingError("There's not enough text to give feedback on.");

  const jobId = startAiJob<FeedbackResult>({
    path: "writing/feedback",
    body: { question: toLite(q), text, wantsEstimate },
    kind: "writing_feedback",
    resourceRef: id,
    onResult: async (r) => {
      const cur = (await getSubmission(id)) ?? s;
      const feedback: FeedbackRow[] = r.rows.map((row) => ({
        id: localId("fb"),
        kind: row.kind,
        startPos: row.startPos ?? null,
        endPos: row.endPos ?? null,
        payload: row.payload ?? {},
        tags: row.tags ?? [],
        criterion: row.criterion ?? null,
      }));
      await putSubmission({
        ...cur,
        status: "graded",
        feedback,
        estimate: r.estimate,
        dominantScript: r.dominantScript,
        charCount: r.charCount,
        overallComment: r.overallComment,
        submittedAt: cur.submittedAt ?? nowIso(),
      });
      try {
        await recordWritingResult({
          subject,
          part,
          criterionScores: Object.fromEntries((r.estimate?.scores ?? []).map((x) => [x.criterion, x.maxMarks ? x.marks / x.maxMarks : 0])),
          errorTags: feedback.flatMap((f) => f.tags),
        });
      } catch (e) {
        // The feedback is saved; a profile update failure shouldn't fail the job.
        console.warn("learner profile update failed:", e instanceof Error ? e.message : e);
      }
      onChange();
      return { submissionId: id };
    },
    onError: async () => {
      const cur = (await getSubmission(id)) ?? s;
      if (cur.status === "grading") await putSubmission({ ...cur, status: "review", submittedAt: null });
      onChange();
    },
  });
  activeJobs.set(id, { id: jobId, kind: "writing_feedback" });
  await putSubmission({ ...s, status: "grading", wantsEstimate, submittedAt: nowIso() });
  return { jobId };
}

/** Same summary the server's level_sample job builds from the feedback rows. */
const feedbackSummary = (rows: FeedbackRow[]) =>
  rows
    .filter((f) => ["task_recap", "problem_sentence", "eng_error", "overall"].includes(f.kind))
    .slice(0, 30)
    .map((f) => `- ${f.kind}: ${JSON.stringify(f.payload)}`)
    .join("\n");

export async function requestSample(id: string, targetLevel: number | undefined, onChange: () => void) {
  const s = await loadSubmission(id);
  if (s.status !== "graded") throw new LocalWritingError("Get feedback first, then ask for a level sample.");
  const q = await loadQuestion(s.questionId);
  const target = targetLevel ?? defaultTargetLevel(s.estimate?.level ?? null);
  const jobId = startAiJob<{ text: string; changes: { original: string; sample: string; note: string }[] }>({
    path: "writing/sample",
    body: { question: toLite(q), text: s.editedText ?? s.aiText ?? "", feedbackSummary: feedbackSummary(s.feedback), script: s.dominantScript, targetLevel: target },
    kind: "level_sample",
    resourceRef: id,
    onResult: async (r) => {
      const cur = (await getSubmission(id)) ?? s;
      const sampleId = localId("ls");
      await putSubmission({ ...cur, samples: [...cur.samples, { id: sampleId, targetLevel: target, text: r.text, changes: r.changes, createdAt: nowIso() }] });
      onChange();
      return { submissionId: id, sampleId };
    },
  });
  activeJobs.set(id, { id: jobId, kind: "level_sample" });
  return { jobId };
}

/** Everything the review / feedback page needs (same shape as GET /api/writing/submissions/:id). */
export async function getSubmissionView(id: string) {
  const s = await loadSubmission(id);
  const q = await loadQuestion(s.questionId);
  const subject = asSubject(q.subject);
  const part = canonicalPart(q);
  const stripped = stripMarkers(s.editedText ?? s.aiText ?? "");
  const children = (await listSubmissions(s.questionId)).filter((c) => c.parentSubmissionId === id);
  const scores = (s.estimate?.scores ?? []).map((r) => ({
    criterion: r.criterion,
    part: s.estimate!.part as string,
    grade: r.grade,
    marks: r.marks,
    maxMarks: r.maxMarks,
    reason: r.reason,
  }));

  return {
    submission: {
      id: s.id,
      questionId: s.questionId,
      status: s.status as "draft" | "transcribing" | "transcribe_failed" | "review" | "grading" | "graded",
      inputMode: s.inputMode,
      wantsEstimate: s.wantsEstimate,
      aiText: s.aiText,
      editedText: s.editedText,
      edits: s.edits,
      dominantScript: s.dominantScript,
      charCount: s.charCount,
      visibility: "private" as const,
      parentSubmissionId: s.parentSubmissionId,
      createdAt: s.createdAt,
      submittedAt: s.submittedAt,
    },
    subject,
    part,
    estimateAllowed: estimateAllowed(subject, part),
    question: toPublic(q),
    cleanText: stripped.clean,
    markers: { unsure: stripped.unsure, insertions: stripped.insertions, malformed: stripped.malformed },
    /** Local mode: `key` is the id of the photo in this device's image store. */
    pages: s.imageIds.map((key, i) => ({ pageNo: i + 1, key })),
    feedback: [...s.feedback].sort((a, b) => (a.startPos ?? Infinity) - (b.startPos ?? Infinity)),
    scores,
    estimate: s.estimate ? { totalMarks: s.estimate.totalMarks, maxMarks: s.estimate.maxMarks, level: s.estimate.level, levelReason: s.estimate.levelReason } : null,
    samples: [...s.samples].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activeJob: liveJob(id),
    revisions: children.map((c) => ({ id: c.id, status: c.status as string, createdAt: c.createdAt })),
  };
}
