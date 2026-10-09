"use client";

import { getLocalJob, startAiJob } from "@/features/jobs/local-jobs";
import { recordAttemptResult } from "@/features/local/learner";
import {
  getAttempt,
  getProfile,
  getQuestion,
  imagesForAi,
  listAttempts,
  localId,
  nowIso,
  putAttempt,
  saveImages,
  saveQuestion,
  type LocalAttempt,
  type LocalQuestion,
} from "@/features/local/local-db";
import { ApiClientError } from "@/lib/api-client";
import type { QuestionLite } from "@/lib/schemas/ai";
import type { PracticeKind, Understanding } from "@/lib/schemas/practice";
import type { QuestionPublic, QuestionSolution } from "@/lib/schemas/question";
import type { Subject } from "@/lib/subjects";
import { markMc, type McResponse } from "@/server/services/practice/mark-mc";
import type { MarkRow, PartRow } from "@/server/services/practice/normalise-marking";
import { codeChecksFor, type CodeCheck } from "../lib/code-checks";
import { diffTranscript } from "../lib/diff-transcript";

/**
 * Local mode practice: questions and attempts live in IndexedDB; the AI work goes to the stateless
 * /api/ai/* routes as in-tab jobs (local-jobs.ts). Each function returns the same shape as the
 * matching cloud endpoint so the components don't care which mode they're in.
 */

const PRACTICE_KINDS = ["mc", "short", "long", "experiment"];

const fail = (status: number, message: string) => new ApiClientError(status, "error", message, {});

/** Attempts with a job running in this tab (attemptId → local job id). */
const liveJobs = new Map<string, string>();
const hasLiveJob = (attemptId: string) => {
  const id = liveJobs.get(attemptId);
  return Boolean(id && getLocalJob(id)?.status === "running");
};

/** A stored "transcribing"/"marking" attempt whose job died with its tab (reload) goes back a step so it can be retried. */
async function recover(a: LocalAttempt): Promise<LocalAttempt> {
  if ((a.status !== "transcribing" && a.status !== "marking") || hasLiveJob(a.id)) return a;
  const status: LocalAttempt["status"] = a.status === "marking" || a.editedTranscript || a.aiTranscript ? "review" : "answering";
  return putAttempt({ ...a, status });
}

async function loadQuestion(id: string) {
  const q = await getQuestion(id);
  if (!q) throw fail(404, "This question isn't saved on this device.");
  return q;
}

async function loadAttempt(id: string) {
  const a = await getAttempt(id);
  if (!a) throw fail(404, "Attempt not found on this device.");
  return recover(a);
}

export function toPublic(q: LocalQuestion): QuestionPublic {
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
    isPrivate: q.origin !== "bank",
    rating: { up: q.rating === 1 ? 1 : 0, down: q.rating === -1 ? 1 : 0 },
    content: { stem: c.stem, materials: c.materials, figure: c.figure, graph: c.graph, options: c.options, writing: c.writing, physicsFigure: c.physicsFigure ?? null },
  };
}

/** The solution, plus (M1/M2) each symbolic answer re-verified by code. */
export function toSolution(q: LocalQuestion): QuestionSolution & { codeChecks: CodeCheck[] } {
  const c = q.content;
  return {
    codeChecks: codeChecksFor(c),
    answers: c.answers,
    markingScheme: c.markingScheme,
    solution: c.solution,
    taskAnalysis: c.taskAnalysis,
    tips: c.tips,
    correctOption: c.correctOption,
    distractorNotes: c.distractorNotes,
  };
}

export const toLite = (q: LocalQuestion): QuestionLite => ({
  subject: q.subject,
  kind: q.kind,
  title: q.title,
  part: q.part,
  language: q.language,
  topicIds: q.topicIds,
  content: q.content,
});

/** Submitted (an MC choice, or a written answer sent for marking): the solution unlocks, as in cloud mode. */
const submitted = (a: LocalAttempt) => a.mcChoice !== null || a.status === "marking" || a.status === "marked";

// --- Questions -----------------------------------------------------------------------------

type GeneratedQuestion = QuestionLite & { difficulty: number; extension: boolean; checkProblems: string[] };

/** No shared bank locally: always generate. Returns `{jobId}`; job.output.questionId. */
export async function localNextQuestion(req: {
  subject: Subject;
  kind: PracticeKind;
  topicIds: string[];
  difficulty: number;
  extension: boolean;
  language?: "zh" | "en";
  instructions?: string;
  knowledgePoint?: string;
}) {
  const language = req.language ?? (await getProfile()).examLanguage;
  const jobId = startAiJob<{ question: GeneratedQuestion }>({
    path: "questions/generate",
    body: { subject: req.subject, kind: req.kind, topicIds: req.topicIds, difficulty: req.difficulty, extension: req.extension, language, forceNew: true, instructions: req.instructions, knowledgePoint: req.knowledgePoint },
    kind: "generate_question",
    resourceRef: req.subject,
    onResult: async ({ question }) => {
      const row = await saveQuestion({ ...question, origin: "bank" });
      return { questionId: row.id };
    },
  });
  return { jobId } as { questionId?: string; jobId?: string };
}

/** `reveal`: the student switched "Show answer" on, so the solution shows without answering first. */
export async function localPracticeQuestion(questionId: string, reveal = false) {
  const q = await loadQuestion(questionId);
  const mine = await Promise.all((await listAttempts(questionId)).slice(0, 20).map(recover));
  const attempted = mine.some(submitted);
  return {
    question: toPublic(q),
    attempted,
    solution: attempted || reveal ? toSolution(q) : null,
    attempts: mine.map((a) => ({
      id: a.id,
      status: a.status,
      score: a.score,
      maxScore: a.maxScore,
      mcChoice: a.mcChoice,
      mcCorrect: a.mcCorrect,
      createdAt: a.createdAt,
    })),
  };
}

// --- Attempts ------------------------------------------------------------------------------

export async function localCreateAttempt(questionId: string) {
  const q = await loadQuestion(questionId);
  if (!PRACTICE_KINDS.includes(q.kind)) throw fail(400, "This question isn't a practice question.");
  const a = await putAttempt({
    id: localId("att"),
    questionId,
    status: "answering",
    mcChoice: null,
    mcCorrect: null,
    imageIds: [],
    aiTranscript: null,
    editedTranscript: null,
    edits: [],
    marks: [],
    parts: [],
    score: null,
    maxScore: null,
    disputes: [],
    createdAt: nowIso(),
    markedAt: null,
  });
  return { id: a.id, questionId: a.questionId, status: a.status };
}

export async function localAttemptDetail(attemptId: string) {
  const a = await loadAttempt(attemptId);
  const q = await loadQuestion(a.questionId);
  const revealed = submitted(a) || (await listAttempts(q.id)).some(submitted);
  return {
    attempt: {
      id: a.id,
      questionId: a.questionId,
      status: a.status,
      mcChoice: a.mcChoice,
      mcCorrect: a.mcCorrect,
      aiTranscript: a.aiTranscript,
      editedTranscript: a.editedTranscript,
      edits: a.edits,
      score: a.score,
      maxScore: a.maxScore,
      visibility: "private" as const,
      createdAt: a.createdAt,
      markedAt: a.markedAt,
    },
    question: toPublic(q),
    solution: revealed ? toSolution(q) : null,
    mc: q.kind === "mc" && a.mcChoice ? markMc(q.content, a.mcChoice) : null,
    /** `key` is a local image id (see PageImage). */
    pages: a.imageIds.map((key, i) => ({ pageNo: i + 1, key })),
    marks: a.marks.map((m) => ({ ...m, attemptId: a.id, type: m.type as "M" | "A" })),
    parts: a.parts.map((p) => ({ ...p, attemptId: a.id })),
    disputes: a.disputes.map((d, i) => ({ id: `${a.id}:${i}`, part: d.part, markIndex: d.markIndex, reason: d.reason, status: "open", createdAt: d.createdAt })),
  };
}

export async function localListAttempts(questionId: string | undefined, limit: number) {
  const rows = await listAttempts(questionId);
  const items = [];
  for (const raw of rows) {
    if (items.length >= limit) break;
    const q = await getQuestion(raw.questionId);
    if (!q || !PRACTICE_KINDS.includes(q.kind)) continue;
    const a = await recover(raw);
    items.push({
      id: a.id,
      questionId: a.questionId,
      status: a.status,
      score: a.score,
      maxScore: a.maxScore,
      mcCorrect: a.mcCorrect,
      createdAt: a.createdAt,
      title: q.title,
      kind: q.kind,
      subject: q.subject,
      topicIds: q.topicIds,
    });
  }
  return { items };
}

/** Instant MC marking, on this device. */
export async function localAnswerMc(attemptId: string, choice: "A" | "B" | "C" | "D"): Promise<McResponse> {
  const a = await loadAttempt(attemptId);
  const q = await loadQuestion(a.questionId);
  if (q.kind !== "mc") throw fail(400, "This is not a multiple-choice question.");
  if (a.mcChoice) return { ...markMc(q.content, a.mcChoice), solution: toSolution(q) };

  const result = markMc(q.content, choice);
  await putAttempt({ ...a, mcChoice: choice, mcCorrect: result.correct, status: "marked", score: result.correct ? 1 : 0, maxScore: 1, markedAt: nowIso() });
  await recordAttemptResult({ subject: q.subject, topicIds: q.topicIds, fraction: result.correct ? 1 : 0, errorTags: result.tag ? [result.tag] : [] });
  return { ...result, solution: toSolution(q) };
}

/** Keep the photos on this device, then transcribe them (job → status review). */
export async function localSubmitPages(attemptId: string, files: File[], onSettled: () => void) {
  const a = await loadAttempt(attemptId);
  const q = await loadQuestion(a.questionId);
  if (q.kind === "mc") throw fail(400, "Multiple-choice questions are answered by choosing an option.");
  if (!["answering", "review"].includes(a.status)) throw fail(409, "This attempt can't take new pages now.");
  if (files.length === 0 || files.length > 8) throw fail(400, "Add 1 to 8 pages.");

  const imageIds = await saveImages(files);
  const images = await imagesForAi(imageIds);
  await putAttempt({ ...a, imageIds, status: "transcribing" });
  const jobId = startAiJob<{ lines: { latex: string }[] }>({
    path: "practice/transcribe",
    body: { images, questionStem: q.content.stem },
    kind: "transcribe_answer",
    resourceRef: a.id,
    onResult: async ({ lines }) => {
      const cur = (await getAttempt(a.id)) ?? a;
      await putAttempt({ ...cur, aiTranscript: lines, editedTranscript: lines, edits: [], status: "review" });
      onSettled();
      return { attemptId: a.id, lines: lines.length };
    },
    onError: async () => {
      const cur = await getAttempt(a.id);
      if (cur?.status === "transcribing") await putAttempt({ ...cur, status: cur.editedTranscript ? "review" : "answering" });
      onSettled();
    },
  });
  liveJobs.set(a.id, jobId);
  return { jobId };
}

export async function localSaveTranscript(attemptId: string, lines: { latex: string }[]) {
  const a = await loadAttempt(attemptId);
  if (!["answering", "review"].includes(a.status)) throw fail(409, "This attempt can't be edited now.");
  const clean = lines.map((l) => ({ latex: l.latex.replace(/\r/g, "") })).filter((l, i, all) => l.latex.trim() || i < all.length - 1);
  const edits = a.aiTranscript ? diffTranscript(a.aiTranscript, clean) : [];
  const row = await putAttempt({ ...a, editedTranscript: clean, edits, status: "review" });
  return { id: row.id, status: row.status, editedTranscript: row.editedTranscript, edits: row.edits };
}

type MarkResult = { marks: MarkRow[]; parts: PartRow[]; score: number; maxScore: number; errorTags: string[]; overrides: unknown };

export async function localStartMarking(attemptId: string, onSettled: () => void) {
  const a = await loadAttempt(attemptId);
  const q = await loadQuestion(a.questionId);
  if (q.kind === "mc") throw fail(400, "Multiple-choice questions are marked instantly.");
  if (q.content.markingScheme.length === 0) throw fail(400, "This question has no marking scheme.");
  if (a.status !== "review") throw fail(409, a.status === "marked" ? "This attempt is already marked." : "Check your transcript first.");
  const lines = a.editedTranscript ?? a.aiTranscript ?? [];
  if (!lines.some((l) => l.latex.trim())) throw fail(400, "Your answer is empty.");

  await putAttempt({ ...a, status: "marking" });
  const jobId = startAiJob<MarkResult>({
    path: "practice/mark",
    body: { question: toLite(q), lines },
    kind: "mark_answer",
    resourceRef: a.id,
    onResult: async (r) => {
      const cur = (await getAttempt(a.id)) ?? a;
      await putAttempt({ ...cur, marks: r.marks, parts: r.parts, score: r.score, maxScore: r.maxScore, status: "marked", markedAt: nowIso() });
      await recordAttemptResult({ subject: q.subject, topicIds: q.topicIds, fraction: r.maxScore ? r.score / r.maxScore : 0, errorTags: r.errorTags });
      onSettled();
      return { attemptId: a.id, score: r.score, maxScore: r.maxScore, overrides: r.overrides };
    },
    onError: async () => {
      const cur = await getAttempt(a.id);
      if (cur?.status === "marking") await putAttempt({ ...cur, status: "review" });
      onSettled();
    },
  });
  liveJobs.set(a.id, jobId);
  return { jobId };
}

/** Disputes stay on this device in local mode (there's no one to send them to). */
export async function localDispute(attemptId: string, input: { part: string; markIndex?: number | null; reason: string }) {
  const a = await loadAttempt(attemptId);
  if (a.status !== "marked") throw fail(409, "You can dispute a mark once the attempt is marked.");
  const d = { part: input.part, markIndex: input.markIndex ?? null, reason: input.reason, createdAt: nowIso() };
  await putAttempt({ ...a, disputes: [d, ...a.disputes] });
  return { id: `${a.id}:${a.disputes.length}`, ...d, status: "open" };
}

// --- From a reference ----------------------------------------------------------------------

export async function localReferenceUnderstand({ subject, files, text }: { subject: Subject; files: File[]; text: string }) {
  if (files.length > 4) throw fail(400, "Up to 4 photos.");
  const images = files.length ? await imagesForAi(await saveImages(files)) : [];
  const jobId = startAiJob<{ understanding: Understanding & { figureProblems?: string[] } }>({
    path: "practice/understand",
    body: { subject, images, text: text.trim() || undefined },
    kind: "reference_understand",
    resourceRef: subject,
    onResult: async ({ understanding }) => ({ understanding }),
  });
  return { jobId };
}

export async function localReferenceGenerate(
  body: { subject: Subject; understanding: Understanding; variation: 1 | 2 | 3; kind: PracticeKind; count: number; language: "zh" | "en"; instructions?: string },
  onSettled: () => void,
) {
  const jobId = startAiJob<{ questions: GeneratedQuestion[]; failed: number }>({
    path: "practice/variants",
    body,
    kind: "reference_generate",
    resourceRef: body.subject,
    onResult: async ({ questions, failed }) => {
      const questionIds: string[] = [];
      for (const q of questions) questionIds.push((await saveQuestion({ ...q, origin: "reference_image" })).id);
      onSettled();
      return { questionIds, failed };
    },
  });
  return { jobId };
}

// --- Solve my question ---------------------------------------------------------------------

/**
 * The student's own question (photos and/or text) → the AI reads it, finds the topic, and writes the answer and an
 * HKEAA-style marking scheme. Saved as a private question; job.output = { questionId, note }.
 */
export async function localSolveQuestion({ subject, files, text, language }: { subject: "physics"; files: File[]; text: string; language?: "zh" | "en" }) {
  if (files.length > 8) throw fail(400, "Up to 8 photos.");
  if (files.length === 0 && !text.trim()) throw fail(400, "Upload a photo or type the question.");
  const images = files.length ? await imagesForAi(await saveImages(files)) : [];
  const jobId = startAiJob<{ question: GeneratedQuestion; note: string | null }>({
    path: "practice/solve",
    body: { subject, images, text: text.trim() || undefined, language },
    kind: "reference_understand",
    resourceRef: subject,
    onResult: async ({ question, note }) => {
      const row = await saveQuestion({ ...question, origin: "own_prompt" });
      return { questionId: row.id, note };
    },
  });
  return { jobId };
}
