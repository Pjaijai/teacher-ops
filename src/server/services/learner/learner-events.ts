import type { Subject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";

/**
 * How the writing and practice features report results to the learner profile.
 * The dashboard feature implements these (EWMA criterion scores, error-tag counts, topic mastery,
 * next steps); callers just report what happened.
 */
export type WritingResult = {
  userId: string;
  subject: Subject;
  part: string;
  submissionId: string;
  questionId: string;
  /** criterion id → score in 0..1 (only when a DSE estimate was made) */
  criterionScores: Record<string, number>;
  /** error tags found in the feedback, e.g. "zh.char.己/已", "en.sva" (repeats allowed) */
  errorTags: string[];
};

export type AttemptResult = {
  userId: string;
  subject: Subject;
  attemptId: string;
  questionId: string;
  topicIds: string[];
  /** score / maxScore in 0..1 */
  fraction: number;
  /** misconception tags, e.g. from the chosen MC distractor */
  errorTags: string[];
};

type Handlers = { writing: (db: Db, r: WritingResult) => Promise<void>; attempt: (db: Db, r: AttemptResult) => Promise<void> };
let handlers: Handlers | null = null;

export function registerLearnerHandlers(h: Handlers) {
  handlers = h;
}

async function load() {
  if (!handlers) await import("./update-profile");
  return handlers;
}

export async function recordWritingResult(db: Db, r: WritingResult) {
  await (await load())?.writing(db, r);
}

export async function recordAttemptResult(db: Db, r: AttemptResult) {
  await (await load())?.attempt(db, r);
}
