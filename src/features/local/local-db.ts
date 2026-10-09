"use client";

import { createId } from "@paralleldrive/cuid2";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { toast } from "sonner";
import type { QuestionLite } from "@/lib/schemas/ai";
import type { ChatMessage, PaperSpec } from "@/lib/schemas/paper";
import type { TrackedEdit } from "@/lib/schemas/writing";
import type { Subject } from "@/lib/subjects";

/**
 * Local mode storage: everything a student makes lives in their browser (IndexedDB).
 * Shapes mirror the server tables so cloud mode can import them later.
 */

export type LocalQuestion = QuestionLite & {
  id: string;
  difficulty: number;
  extension: boolean;
  origin: "bank" | "reference_image" | "own_prompt" | "paper";
  checkProblems: string[];
  rating: 1 | -1 | 0;
  createdAt: string;
};

export type FeedbackRow = {
  id: string;
  kind: string;
  startPos: number | null;
  endPos: number | null;
  payload: Record<string, unknown>;
  tags: string[];
  criterion: string | null;
};

export type ScoreRow = { criterion: string; grade: string; marks: number; maxMarks: number; reason: string; anchorIds: string[] };
export type Estimate = { part: "A" | "B"; scores: ScoreRow[]; totalMarks: number; maxMarks: number; level: number; levelReason: string };
export type LevelSample = { id: string; targetLevel: number; text: string; changes: { original: string; sample: string; note: string }[]; createdAt: string };

export type LocalSubmission = {
  id: string;
  questionId: string;
  /** transcribing → review → grading → graded (or transcribe_failed) */
  status: "transcribing" | "transcribe_failed" | "review" | "grading" | "graded";
  inputMode: "typed" | "photo";
  wantsEstimate: boolean;
  imageIds: string[];
  aiText: string | null;
  editedText: string | null;
  edits: TrackedEdit[];
  dominantScript: "trad" | "simp" | null;
  charCount: number | null;
  overallComment: string | null;
  feedback: FeedbackRow[];
  estimate: Estimate | null;
  samples: LevelSample[];
  parentSubmissionId: string | null;
  createdAt: string;
  submittedAt: string | null;
};

export type AttemptMark = { part: string; markIndex: number; type: string; awarded: boolean; reason: string; studentLine: number | null; ecfFrom: string | null };
export type AttemptPart = { part: string; firstWrongLine: number | null; note: string };

export type LocalAttempt = {
  id: string;
  questionId: string;
  /** answering → transcribing → review → marking → marked */
  status: "answering" | "transcribing" | "review" | "marking" | "marked";
  mcChoice: string | null;
  mcCorrect: boolean | null;
  imageIds: string[];
  aiTranscript: { latex: string }[] | null;
  editedTranscript: { latex: string }[] | null;
  edits: TrackedEdit[];
  marks: AttemptMark[];
  parts: AttemptPart[];
  score: number | null;
  maxScore: number | null;
  disputes: { part: string; markIndex: number | null; reason: string; createdAt: string }[];
  createdAt: string;
  markedAt: string | null;
};

export type LocalProfile = {
  displayName: string;
  form: number | null;
  subjects: Subject[];
  examLanguage: "zh" | "en";
  extensionTrack: boolean;
  onboarded: boolean;
};

export type PaperSlotRow = {
  n: number;
  section: "A" | "B";
  strand: "I" | "II" | "III" | "IV" | "V";
  topicIds: string[];
  kind: "mc" | "short" | "long" | "experiment";
  difficulty: number;
  marks: number;
  instructions: string;
  questionId: string | null;
  /** Earlier versions, newest last (for "Undo" after a regenerate). */
  previousQuestionIds: string[];
  error: string | null;
  /** Edited by hand since the answer was last written. */
  answerStale: boolean;
  mcChoice: "A" | "B" | "C" | "D" | null;
  flagged: boolean;
  /** 1B, after the student skipped marking it: left out of the score. */
  skipped: boolean;
};

export type LocalPaper = {
  id: string;
  subject: "physics";
  /** planning → generating → review → sitting → submitted */
  status: "planning" | "generating" | "review" | "sitting" | "submitted";
  spec: PaperSpec;
  chat: ChatMessage[];
  slots: PaperSlotRow[];
  startedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

export type StatRow = { key: string; subject: Subject; ewma: number; attempts: number; lastAt: string };
export type TagRow = { key: string; subject: Subject; tag: string; weighted: number; total: number; lastAt: string };

interface LocalSchema extends DBSchema {
  questions: { key: string; value: LocalQuestion; indexes: { createdAt: string } };
  submissions: { key: string; value: LocalSubmission; indexes: { questionId: string; createdAt: string } };
  attempts: { key: string; value: LocalAttempt; indexes: { questionId: string; createdAt: string } };
  helpers: { key: string; value: { key: string; questionId: string; kind: string; content: unknown; createdAt: string } };
  images: { key: string; value: { id: string; blob: Blob; createdAt: string } };
  /** criterion stats (key `${subject}:${part}:${criterion}`) and topic mastery (key `topic:${topicId}`) */
  stats: { key: string; value: StatRow };
  tags: { key: string; value: TagRow };
  kv: { key: string; value: unknown };
  papers: { key: string; value: LocalPaper; indexes: { createdAt: string } };
}

let dbPromise: Promise<IDBPDatabase<LocalSchema>> | null = null;

export function localDb() {
  dbPromise ??= openDB<LocalSchema>("dse-practice", 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) db.createObjectStore("papers", { keyPath: "id" }).createIndex("createdAt", "createdAt");
      if (oldVersion >= 1) return;
      db.createObjectStore("questions", { keyPath: "id" }).createIndex("createdAt", "createdAt");
      const subs = db.createObjectStore("submissions", { keyPath: "id" });
      subs.createIndex("questionId", "questionId");
      subs.createIndex("createdAt", "createdAt");
      const atts = db.createObjectStore("attempts", { keyPath: "id" });
      atts.createIndex("questionId", "questionId");
      atts.createIndex("createdAt", "createdAt");
      db.createObjectStore("helpers", { keyPath: "key" });
      db.createObjectStore("images", { keyPath: "id" });
      db.createObjectStore("stats", { keyPath: "key" });
      db.createObjectStore("tags", { keyPath: "key" });
      db.createObjectStore("kv");
    },
    // Another tab opened a newer version: let go so its upgrade can run, and reopen on next use.
    blocking() {
      void dbPromise?.then((db) => db.close());
      dbPromise = null;
    },
    // An older tab still holds the database open (it predates `blocking` above): ask the student to close it.
    blocked() {
      console.warn("dse-practice: database upgrade is waiting for other tabs of this app to close or reload.");
      toast.warning("This app was updated. Close or reload its other open tabs to continue.", { duration: Infinity, id: "db-blocked" });
    },
  });
  return dbPromise;
}

export const localId = (prefix: string) => `${prefix}_${createId()}`;
export const nowIso = () => new Date().toISOString();

// --- Profile -------------------------------------------------------------------------------

const DEFAULT_PROFILE: LocalProfile = {
  displayName: "",
  form: null,
  subjects: ["chi_writing", "eng_writing", "math_cp"],
  examLanguage: "en",
  extensionTrack: true,
  onboarded: false,
};

export async function getProfile(): Promise<LocalProfile> {
  const p = (await (await localDb()).get("kv", "profile")) as LocalProfile | undefined;
  return { ...DEFAULT_PROFILE, ...p };
}

export async function saveProfile(patch: Partial<LocalProfile>) {
  const next = { ...(await getProfile()), ...patch };
  await (await localDb()).put("kv", next, "profile");
  return next;
}

// --- Questions -----------------------------------------------------------------------------

export async function saveQuestion(q: Omit<LocalQuestion, "id" | "createdAt" | "rating"> & { id?: string }) {
  const row: LocalQuestion = { ...q, id: q.id ?? localId("q"), rating: 0, createdAt: nowIso() };
  await (await localDb()).put("questions", row);
  return row;
}

export async function getQuestion(id: string) {
  return (await localDb()).get("questions", id);
}

export async function listQuestions() {
  const all = await (await localDb()).getAllFromIndex("questions", "createdAt");
  return all.reverse();
}

export async function updateQuestion(id: string, patch: Partial<LocalQuestion>) {
  const db = await localDb();
  const q = await db.get("questions", id);
  if (!q) throw new Error("Question not found");
  const next = { ...q, ...patch };
  await db.put("questions", next);
  return next;
}

// --- Exam papers ---------------------------------------------------------------------------

export async function putPaper(p: LocalPaper) {
  await (await localDb()).put("papers", p);
  return p;
}

export async function getPaper(id: string) {
  return (await localDb()).get("papers", id);
}

export async function listPapers() {
  const all = await (await localDb()).getAllFromIndex("papers", "createdAt");
  return all.reverse();
}

export async function deletePaper(id: string) {
  await (await localDb()).delete("papers", id);
}

// --- Submissions and attempts --------------------------------------------------------------

export async function putSubmission(s: LocalSubmission) {
  await (await localDb()).put("submissions", s);
  return s;
}
export async function getSubmission(id: string) {
  return (await localDb()).get("submissions", id);
}
export async function listSubmissions(questionId?: string) {
  const db = await localDb();
  const rows = questionId ? await db.getAllFromIndex("submissions", "questionId", questionId) : await db.getAll("submissions");
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function putAttempt(a: LocalAttempt) {
  await (await localDb()).put("attempts", a);
  return a;
}
export async function getAttempt(id: string) {
  return (await localDb()).get("attempts", id);
}
export async function listAttempts(questionId?: string) {
  const db = await localDb();
  const rows = questionId ? await db.getAllFromIndex("attempts", "questionId", questionId) : await db.getAll("attempts");
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Helpers (cached Ask-AI results) -------------------------------------------------------

export async function getHelpers(questionId: string) {
  const all = await (await localDb()).getAll("helpers");
  return Object.fromEntries(all.filter((h) => h.questionId === questionId).map((h) => [h.kind, h.content])) as Record<string, unknown>;
}
export async function saveHelper(questionId: string, kind: string, content: unknown) {
  await (await localDb()).put("helpers", { key: `${questionId}:${kind}`, questionId, kind, content, createdAt: nowIso() });
}

// --- Images --------------------------------------------------------------------------------

export async function saveImages(files: Blob[]) {
  const db = await localDb();
  const ids: string[] = [];
  for (const blob of files) {
    const id = localId("img");
    await db.put("images", { id, blob, createdAt: nowIso() });
    ids.push(id);
  }
  return ids;
}
export async function getImage(id: string) {
  return (await (await localDb()).get("images", id))?.blob ?? null;
}

/** Images as base64 for the AI API, in page order. */
export async function imagesForAi(ids: string[]) {
  const out = [];
  for (const id of ids) {
    const blob = await getImage(id);
    if (!blob) throw new Error("A photo is missing from this device.");
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    out.push({ mediaType: (blob.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp", data: btoa(bin) });
  }
  return out;
}
