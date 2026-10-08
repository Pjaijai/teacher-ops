import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { TrackedEdit } from "@/lib/schemas/writing";
import type { Db } from "@/server/db/client";
import { attemptMarks, attemptPages, attemptParts, attempts, markDisputes, questions, type TranscriptLine } from "@/server/db/schema";
import { ApiError, forbidden, invalid, notFound } from "@/server/errors";
import { startJob } from "@/server/jobs/job-runner";
import { chargeCredits } from "@/server/services/credits/credits";
import { recordAttemptResult } from "@/server/services/learner/learner-events";
import { hasAttempted, loadQuestion, markViewed, toPublic, toSolution } from "@/server/services/questions/question-bank";
import { ownsKey } from "@/server/storage/storage";
import { markMc, type McResponse } from "./mark-mc";

/**
 * Practice attempts. Status: answering → transcribing → review → marking → marked.
 * MC attempts go straight from answering to marked.
 */

const PRACTICE_KINDS = ["mc", "short", "long", "experiment"] as const;

export async function getOwnedAttempt(db: Db, userId: string, attemptId: string) {
  const [a] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)));
  if (!a) throw notFound("Attempt not found");
  return a;
}

async function questionOf(db: Db, questionId: string) {
  const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!q) throw notFound("Question not found");
  return q;
}

const conflict = (msg: string) => new ApiError(409, "conflict", msg);

export async function createAttempt(db: Db, userId: string, questionId: string) {
  const q = await loadQuestion(db, userId, questionId);
  if (!(PRACTICE_KINDS as readonly string[]).includes(q.kind)) throw invalid("This question isn't a practice question.");
  const [a] = await db.insert(attempts).values({ userId, questionId }).returning();
  await markViewed(db, userId, questionId);
  return a;
}

/** The practice question view: the question, the student's attempts and (once attempted) the solution. */
export async function getPracticeQuestion(db: Db, userId: string, questionId: string) {
  const q = await loadQuestion(db, userId, questionId);
  await markViewed(db, userId, questionId);
  const attempted = await hasAttempted(db, userId, questionId);
  const mine = await db
    .select({ id: attempts.id, status: attempts.status, score: attempts.score, maxScore: attempts.maxScore, mcChoice: attempts.mcChoice, mcCorrect: attempts.mcCorrect, createdAt: attempts.createdAt })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.questionId, questionId)))
    .orderBy(desc(attempts.createdAt))
    .limit(20);
  return {
    question: toPublic(q),
    attempted,
    solution: attempted ? toSolution(q) : null,
    attempts: mine.map((a) => ({ ...a, score: a.score === null ? null : Number(a.score), maxScore: a.maxScore === null ? null : Number(a.maxScore) })),
  };
}

export async function answerMc(db: Db, userId: string, attemptId: string, choice: "A" | "B" | "C" | "D"): Promise<McResponse> {
  const a = await getOwnedAttempt(db, userId, attemptId);
  const q = await questionOf(db, a.questionId);
  if (q.kind !== "mc") throw invalid("This is not a multiple-choice question.");

  // Already answered: return the stored result (no second tries on the same attempt).
  if (a.mcChoice) return { ...markMc(q.content, a.mcChoice), solution: toSolution(q) };

  const result = markMc(q.content, choice);
  await db
    .update(attempts)
    .set({ mcChoice: choice, mcCorrect: result.correct, status: "marked", score: result.correct ? "1" : "0", maxScore: "1", markedAt: new Date() })
    .where(eq(attempts.id, a.id));
  await markViewed(db, userId, q.id, { attempted: true });
  await recordAttemptResult(db, {
    userId,
    subject: q.subject,
    attemptId: a.id,
    questionId: q.id,
    topicIds: q.topicIds,
    fraction: result.correct ? 1 : 0,
    errorTags: result.tag ? [result.tag] : [],
  });
  return { ...result, solution: toSolution(q) };
}

/** Store the photo pages, charge, and start transcription. */
export async function submitPages(db: Db, userId: string, attemptId: string, uploadKeys: string[]) {
  const a = await getOwnedAttempt(db, userId, attemptId);
  const q = await questionOf(db, a.questionId);
  if (q.kind === "mc") throw invalid("Multiple-choice questions are answered by choosing an option.");
  if (!["answering", "review"].includes(a.status)) throw conflict("This attempt can't take new pages now.");
  if (uploadKeys.some((k) => !ownsKey(userId, k))) throw forbidden("You can only use your own uploads.");

  const credits = await chargeCredits(db, userId, "transcribe_page", { units: uploadKeys.length });
  await db.delete(attemptPages).where(eq(attemptPages.attemptId, a.id));
  await db.insert(attemptPages).values(uploadKeys.map((storageKey, i) => ({ attemptId: a.id, pageNo: i + 1, storageKey })));
  await db.update(attempts).set({ status: "transcribing" }).where(eq(attempts.id, a.id));
  const jobId = await startJob(db, { userId, kind: "transcribe_answer", resourceRef: a.id, input: { attemptId: a.id }, credits });
  return { jobId };
}

/** Line-by-line tracked edits against the AI's reading. */
export function diffTranscript(ai: TranscriptLine[], edited: TranscriptLine[]): TrackedEdit[] {
  const edits: TrackedEdit[] = [];
  for (let i = 0; i < Math.max(ai.length, edited.length); i++) {
    const before = ai[i]?.latex ?? "";
    const after = edited[i]?.latex ?? "";
    if (before.trim() !== after.trim()) edits.push({ at: i, before, after });
  }
  return edits;
}

/** Save the student's checked transcript. Typing LaTeX directly (no photos) is allowed too. */
export async function saveTranscript(db: Db, userId: string, attemptId: string, lines: TranscriptLine[]) {
  const a = await getOwnedAttempt(db, userId, attemptId);
  if (!["answering", "review"].includes(a.status)) throw conflict("This attempt can't be edited now.");
  const clean = lines.map((l) => ({ latex: l.latex.replace(/\r/g, "") })).filter((l, i, all) => l.latex.trim() || i < all.length - 1);
  // Typed answers (no AI reading) have nothing to track.
  const edits = a.aiTranscript ? diffTranscript(a.aiTranscript, clean) : [];
  const [row] = await db
    .update(attempts)
    .set({ editedTranscript: clean, edits, status: "review" })
    .where(eq(attempts.id, a.id))
    .returning();
  return { id: row.id, status: row.status, editedTranscript: row.editedTranscript, edits: row.edits };
}

export async function startMarking(db: Db, userId: string, attemptId: string) {
  const a = await getOwnedAttempt(db, userId, attemptId);
  const q = await questionOf(db, a.questionId);
  if (q.kind === "mc") throw invalid("Multiple-choice questions are marked instantly.");
  if (q.content.markingScheme.length === 0) throw invalid("This question has no marking scheme.");
  if (a.status !== "review") throw conflict(a.status === "marked" ? "This attempt is already marked." : "Check your transcript first.");
  const lines = a.editedTranscript ?? a.aiTranscript ?? [];
  if (!lines.some((l) => l.latex.trim())) throw invalid("Your answer is empty.");

  const credits = await chargeCredits(db, userId, "mark_answer");
  await db.update(attempts).set({ status: "marking" }).where(eq(attempts.id, a.id));
  // Submitting counts as an attempt: the solution and community answers unlock.
  await markViewed(db, userId, q.id, { attempted: true });
  const jobId = await startJob(db, { userId, kind: "mark_answer", resourceRef: a.id, input: { attemptId: a.id }, credits });
  return { jobId };
}

export async function getAttemptDetail(db: Db, userId: string, attemptId: string) {
  const a = await getOwnedAttempt(db, userId, attemptId);
  const q = await questionOf(db, a.questionId);
  const [pages, marks, parts, disputes] = await Promise.all([
    db.select().from(attemptPages).where(eq(attemptPages.attemptId, a.id)).orderBy(asc(attemptPages.pageNo)),
    db.select().from(attemptMarks).where(eq(attemptMarks.attemptId, a.id)).orderBy(asc(attemptMarks.part), asc(attemptMarks.markIndex)),
    db.select().from(attemptParts).where(eq(attemptParts.attemptId, a.id)).orderBy(asc(attemptParts.part)),
    db.select().from(markDisputes).where(eq(markDisputes.attemptId, a.id)).orderBy(desc(markDisputes.createdAt)),
  ]);
  const revealed = a.status === "marked" || a.status === "marking" || (await hasAttempted(db, userId, q.id));
  const mc = q.kind === "mc" && a.mcChoice ? markMc(q.content, a.mcChoice) : null;
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
      score: a.score === null ? null : Number(a.score),
      maxScore: a.maxScore === null ? null : Number(a.maxScore),
      visibility: a.visibility,
      createdAt: a.createdAt,
      markedAt: a.markedAt,
    },
    question: toPublic(q),
    solution: revealed ? toSolution(q) : null,
    mc,
    pages: pages.map((p) => ({ pageNo: p.pageNo, key: p.storageKey })),
    marks: marks.map((m) => ({ ...m, type: m.type as "M" | "A" })),
    parts,
    disputes: disputes.map((d) => ({ id: d.id, part: d.part, markIndex: d.markIndex, reason: d.studentReason, status: d.status, createdAt: d.createdAt })),
  };
}

export async function listAttempts(db: Db, userId: string, opts: { questionId?: string; limit?: number } = {}) {
  const rows = await db
    .select({
      id: attempts.id,
      questionId: attempts.questionId,
      status: attempts.status,
      score: attempts.score,
      maxScore: attempts.maxScore,
      mcCorrect: attempts.mcCorrect,
      createdAt: attempts.createdAt,
      title: questions.title,
      kind: questions.kind,
      subject: questions.subject,
      topicIds: questions.topicIds,
    })
    .from(attempts)
    .innerJoin(questions, eq(questions.id, attempts.questionId))
    .where(
      and(
        eq(attempts.userId, userId),
        opts.questionId ? eq(attempts.questionId, opts.questionId) : undefined,
        inArray(questions.kind, ["mc", "short", "long", "experiment"]),
      ),
    )
    .orderBy(desc(attempts.createdAt))
    .limit(Math.min(opts.limit ?? 20, 100));
  return rows.map((r) => ({ ...r, score: r.score === null ? null : Number(r.score), maxScore: r.maxScore === null ? null : Number(r.maxScore) }));
}
