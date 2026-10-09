"use client";

import { callAi, startAiJob } from "@/features/jobs/local-jobs";
import { recordAttemptResult } from "@/features/local/learner";
import {
  deletePaper,
  getPaper,
  getProfile,
  getQuestion,
  listAttempts,
  localId,
  nowIso,
  putPaper,
  saveQuestion,
  updateQuestion,
  type LocalPaper,
  type LocalQuestion,
  type PaperSlotRow,
} from "@/features/local/local-db";
import { toLite, toPublic, toSolution } from "@/features/practice/api/local-practice";
import { ApiClientError } from "@/lib/api-client";
import type { QuestionLite } from "@/lib/schemas/ai";
import { defaultPaperSpec, type PaperPlanReply, type PaperSpec } from "@/lib/schemas/paper";
import type { QuestionContent } from "@/lib/schemas/question";
import { markMc } from "@/server/services/practice/mark-mc";
import { buildPhysicsBlueprint, scorePaper } from "../lib/physics-blueprint";

/**
 * Physics exam paper mode (local only). A paper lives in IndexedDB; each question is generated through the same
 * /api/ai/questions/generate call as single practice questions and saved as a normal question (origin "paper"),
 * so the practice page, its photo marking and the solution view all work on paper questions unchanged.
 */

const fail = (status: number, message: string) => new ApiClientError(status, "error", message, {});

export const slotKey = (s: Pick<PaperSlotRow, "section" | "n">) => `${s.section}${s.n}`;

// --- Change notifications and per-paper write queue ----------------------------------------

const listeners = new Set<(paperId: string) => void>();
export function onPaperChange(fn: (paperId: string) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
const notify = (id: string) => listeners.forEach((fn) => fn(id));

/** Slots with an AI call in flight in this tab (paperId:slotKey). */
const busy = new Set<string>();
export const isSlotBusy = (paperId: string, key: string) => busy.has(`${paperId}:${key}`);

/** Writes to one paper go one at a time, so parallel generations don't overwrite each other's slots. */
const queues = new Map<string, Promise<unknown>>();
function mutate(id: string, fn: (p: LocalPaper) => LocalPaper | Promise<LocalPaper>): Promise<LocalPaper> {
  const run = (queues.get(id) ?? Promise.resolve()).then(async () => {
    const p = await getPaper(id);
    if (!p) throw fail(404, "This paper isn't saved on this device.");
    const next = await putPaper(await fn(p));
    notify(id);
    return next;
  });
  queues.set(id, run.catch(() => {}));
  return run;
}
const mutateSlot = (id: string, key: string, patch: Partial<PaperSlotRow>) =>
  mutate(id, (p) => ({ ...p, slots: p.slots.map((s) => (slotKey(s) === key ? { ...s, ...patch } : s)) }));

/** A streamed /api/ai call as a promise. */
function runJob<T>(path: string, body: unknown, resourceRef: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    startAiJob<T>({
      path,
      body,
      kind: "generate_question",
      resourceRef,
      onResult: async (r) => resolve(r),
      onError: (message) => reject(new Error(message)),
    });
  });
}

type GeneratedQuestion = QuestionLite & { difficulty: number; extension: boolean; checkProblems: string[] };

// --- Papers ------------------------------------------------------------------------------------

export async function loadPaper(id: string) {
  const p = await getPaper(id);
  if (!p) throw fail(404, "This paper isn't saved on this device.");
  const questions = new Map<string, LocalQuestion>();
  for (const s of p.slots) {
    if (!s.questionId) continue;
    const q = await getQuestion(s.questionId);
    if (q) questions.set(s.questionId, q);
  }
  return { paper: p, questions };
}

export async function createPaper() {
  const profile = await getProfile();
  const p: LocalPaper = {
    id: localId("paper"),
    subject: "physics",
    status: "planning",
    spec: defaultPaperSpec(profile.examLanguage, profile.extensionTrack),
    chat: [],
    slots: [],
    startedAt: null,
    submittedAt: null,
    createdAt: nowIso(),
  };
  return putPaper(p);
}

export { deletePaper };

export const saveSpec = (id: string, spec: PaperSpec) => mutate(id, (p) => ({ ...p, spec }));

/** One turn of the setup chat: the student's message (and any hand edits to the spec) → AI reply + updated spec. */
export async function sendPlanMessage(id: string, text: string, spec: PaperSpec) {
  const withUser = await mutate(id, (p) => ({ ...p, spec, chat: [...p.chat, { role: "user" as const, text }] }));
  const r = await callAi<PaperPlanReply>("papers/plan", { messages: withUser.chat.slice(-40), spec });
  await mutate(id, (p) => ({ ...p, spec: r.spec, chat: [...p.chat, { role: "assistant" as const, text: r.reply }] }));
  return r;
}

/** Lay out the slots from the spec and start generating. */
export async function generatePaper(id: string) {
  await mutate(id, (p) => {
    const slots: PaperSlotRow[] = buildPhysicsBlueprint(p.spec).map((s) => ({
      ...s,
      questionId: null,
      previousQuestionIds: [],
      error: null,
      answerStale: false,
      mcChoice: null,
      flagged: false,
      skipped: false,
    }));
    return { ...p, status: "generating", slots };
  });
  void fillPaper(id);
}

const generateBody = (p: LocalPaper, s: PaperSlotRow, extra = "") => ({
  subject: "physics",
  kind: s.kind,
  topicIds: s.topicIds,
  difficulty: s.difficulty,
  extension: p.spec.extension,
  language: p.spec.language,
  forceNew: true,
  // The slot's instructions are English, so say the language outright or the model may follow them into English.
  instructions: [
    p.spec.language === "zh" ? "Write the whole question and its answers in Traditional Chinese (香港中文)." : "Write the whole question and its answers in English.",
    s.instructions,
    extra,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 500),
});

async function generateSlot(p: LocalPaper, s: PaperSlotRow, extra = "") {
  const { question } = await runJob<{ question: GeneratedQuestion }>("questions/generate", generateBody(p, s, extra), slotKey(s));
  return saveQuestion({ ...question, origin: "paper" });
}

const filling = new Set<string>();
const POOL = 4;

/**
 * Generate every empty slot, four at a time. Safe to call again (after a reload, or "retry failed"): only slots without
 * a question and not already in flight are generated. Moves the paper to review when every slot has a question.
 */
export async function fillPaper(id: string, { retryFailed = false } = {}) {
  if (filling.has(id)) return;
  filling.add(id);
  try {
    let p = await mutate(id, (x) => ({
      ...x,
      status: x.status === "review" ? "generating" : x.status,
      slots: retryFailed ? x.slots.map((s) => (s.questionId ? s : { ...s, error: null })) : x.slots,
    }));
    const todo = p.slots.filter((s) => !s.questionId && !s.error && !isSlotBusy(id, slotKey(s)));
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const s = todo[i++];
        const key = slotKey(s);
        busy.add(`${id}:${key}`);
        notify(id);
        try {
          const q = await generateSlot(p, s);
          await mutateSlot(id, key, { questionId: q.id, error: null });
        } catch (e) {
          await mutateSlot(id, key, { error: e instanceof Error ? e.message : String(e) });
        } finally {
          busy.delete(`${id}:${key}`);
          notify(id);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(POOL, todo.length) }, worker));
    p = await mutate(id, (x) => (x.status === "generating" && x.slots.every((s) => s.questionId) ? { ...x, status: "review" } : x));
  } finally {
    filling.delete(id);
  }
}

/** Let the student continue to review with some slots failed (they can regenerate them there). */
export const continueToReview = (id: string) => mutate(id, (p) => ({ ...p, status: "review" }));

// --- Review: regenerate, undo, edit, re-answer ---------------------------------------------------

export async function regenerateSlot(id: string, key: string, instruction: string) {
  const p = await getPaper(id);
  const s = p?.slots.find((x) => slotKey(x) === key);
  if (!p || !s) throw fail(404, "Question not found in this paper.");
  const old = s.questionId ? await getQuestion(s.questionId) : undefined;
  const extra = [
    instruction.trim() ? `The student asked for a new version: ${instruction.trim()}` : "",
    old ? `Write a DIFFERENT question from the previous one ("${old.title}").` : "",
  ]
    .filter(Boolean)
    .join("\n");
  busy.add(`${id}:${key}`);
  notify(id);
  try {
    const q = await generateSlot(p, s, extra);
    await mutateSlot(id, key, {
      questionId: q.id,
      previousQuestionIds: s.questionId ? [...s.previousQuestionIds, s.questionId] : s.previousQuestionIds,
      error: null,
      answerStale: false,
    });
  } finally {
    busy.delete(`${id}:${key}`);
    notify(id);
  }
}

export async function undoRegenerate(id: string, key: string) {
  await mutate(id, (p) => ({
    ...p,
    slots: p.slots.map((s) => {
      if (slotKey(s) !== key || s.previousQuestionIds.length === 0) return s;
      return { ...s, questionId: s.previousQuestionIds.at(-1)!, previousQuestionIds: s.previousQuestionIds.slice(0, -1), answerStale: false };
    }),
  }));
}

export type QuestionEdit = Pick<QuestionContent, "stem" | "options" | "correctOption"> & { removeFigure: boolean };

/** Save a hand edit of the question side. The answer side is now out of date until re-answered. */
export async function saveQuestionEdit(id: string, key: string, edit: QuestionEdit) {
  const p = await getPaper(id);
  const s = p?.slots.find((x) => slotKey(x) === key);
  if (!s?.questionId) throw fail(404, "Question not found in this paper.");
  const q = await getQuestion(s.questionId);
  if (!q) throw fail(404, "Question not found on this device.");
  const content: QuestionContent = {
    ...q.content,
    stem: edit.stem,
    options: q.kind === "mc" ? edit.options : [],
    correctOption: q.kind === "mc" ? edit.correctOption : null,
    physicsFigure: edit.removeFigure ? null : (q.content.physicsFigure ?? null),
    graph: edit.removeFigure ? null : q.content.graph,
  };
  await updateQuestion(q.id, { content });
  await mutateSlot(id, key, { answerStale: true });
}

/** Re-answer an edited question: AI redoes the answers, marking scheme and solution; the question stays as edited. */
export async function reanswerSlot(id: string, key: string) {
  const p = await getPaper(id);
  const s = p?.slots.find((x) => slotKey(x) === key);
  if (!s?.questionId) throw fail(404, "Question not found in this paper.");
  const q = await getQuestion(s.questionId);
  if (!q) throw fail(404, "Question not found on this device.");
  busy.add(`${id}:${key}`);
  notify(id);
  try {
    const { question } = await runJob<{ question: QuestionLite & { checkProblems: string[] } }>("physics/answer", { question: toLite(q) }, key);
    await updateQuestion(q.id, { title: question.title, topicIds: question.topicIds, content: question.content, checkProblems: question.checkProblems });
    await mutateSlot(id, key, { answerStale: false });
  } finally {
    busy.delete(`${id}:${key}`);
    notify(id);
  }
}

// --- Sitting ----------------------------------------------------------------------------------

export const startPaper = (id: string) =>
  mutate(id, (p) => ({ ...p, status: "sitting", startedAt: p.startedAt ?? nowIso(), slots: p.slots.filter((s) => s.questionId) }));

export const answerSlot = (id: string, key: string, choice: PaperSlotRow["mcChoice"]) => mutateSlot(id, key, { mcChoice: choice });
export const flagSlot = (id: string, key: string, flagged: boolean) => mutateSlot(id, key, { flagged });

/** Hand in: MC is marked by code straight away and feeds the learner profile. 1B is marked from photos afterwards. */
export async function submitPaper(id: string) {
  const p = await getPaper(id);
  if (!p || p.status !== "sitting") return p;
  for (const s of p.slots) {
    if (s.section !== "A" || !s.questionId) continue;
    const q = await getQuestion(s.questionId);
    if (!q) continue;
    const r = s.mcChoice ? markMc(q.content, s.mcChoice) : null;
    await recordAttemptResult({ subject: "physics", topicIds: q.topicIds, fraction: r?.correct ? 1 : 0, errorTags: r?.tag ? [r.tag] : [] });
  }
  return mutate(id, (x) => ({ ...x, status: "submitted", submittedAt: nowIso() }));
}

export const skipSlot = (id: string, key: string, skipped: boolean) => mutateSlot(id, key, { skipped });

/** Remaining seconds of a sitting (negative once time is up). */
export function secondsLeft(p: Pick<LocalPaper, "startedAt" | "spec">, now = Date.now()) {
  if (!p.startedAt) return p.spec.durationMin * 60;
  return Math.round(p.spec.durationMin * 60 - (now - new Date(p.startedAt).getTime()) / 1000);
}

// --- Results ------------------------------------------------------------------------------------

const schemeMarks = (q: LocalQuestion | undefined, fallback: number) => {
  const total = q?.content.markingScheme.reduce((t, part) => t + part.marks, 0) ?? 0;
  return total > 0 ? total : fallback;
};

export async function paperResults(id: string) {
  const { paper, questions } = await loadPaper(id);
  const rows = await Promise.all(
    paper.slots.map(async (s) => {
      const q = s.questionId ? questions.get(s.questionId) : undefined;
      if (s.section === "A") {
        const r = q && s.mcChoice ? markMc(q.content, s.mcChoice) : null;
        return { slot: s, question: q, score: r?.correct ? 1 : 0, maxScore: 1, attemptId: null as string | null, status: "marked" as string };
      }
      const attempts = q ? await listAttempts(q.id) : [];
      const marked = attempts.find((a) => a.status === "marked" && a.score !== null);
      const latest = attempts[0];
      return {
        slot: s,
        question: q,
        score: s.skipped ? null : (marked?.score ?? null),
        maxScore: marked?.maxScore ?? schemeMarks(q, s.marks),
        attemptId: (marked ?? latest)?.id ?? null,
        status: s.skipped ? "skipped" : (marked ? "marked" : (latest?.status ?? "none")),
      };
    }),
  );
  const summary = scorePaper(rows.filter((r) => r.status !== "skipped").map((r) => ({ section: r.slot.section, strand: r.slot.strand, score: r.score, maxScore: r.maxScore })));
  return { paper, rows, summary };
}

/** Public question + solution for screens that show a paper question (review, results, print). */
export const publicOf = (q: LocalQuestion) => ({ question: toPublic(q), solution: toSolution(q) });
