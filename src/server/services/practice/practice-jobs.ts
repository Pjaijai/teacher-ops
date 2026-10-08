import { eq } from "drizzle-orm";
import { ReferenceGenerateSchema } from "@/lib/schemas/practice";
import { SubjectSchema } from "@/lib/schemas/question";
import { referenceExtra, type VariationLevel } from "@/server/ai/prompts/math-reference";
import { attemptMarks, attemptPages, attemptParts, attempts, questions } from "@/server/db/schema";
import { registerJob } from "@/server/jobs/job-runner";
import { refundCredits } from "@/server/services/credits/credits";
import { recordAttemptResult } from "@/server/services/learner/learner-events";
import { saveQuestion } from "@/server/services/questions/question-bank";
import { getImagesForAi } from "@/server/storage/storage";
import { CREDIT_COSTS } from "@/lib/credits";
import { z } from "zod";
import { checkDraft, draftMathQuestion, repairMathQuestion, toMathKind, toNewQuestion, type MathGenerateRequest } from "./generate-math-question";
import { markMathAnswer } from "./mark-answer";
import { understandReference } from "./reference-understand";
import { generateCheckedPhysicsQuestion, toNewPhysicsQuestion, toPhysicsKind, understandPhysicsReference, type PhysicsGenerateRequest } from "./generate-physics-question";
import { physicsReferenceExtra } from "@/server/ai/prompts/physics-reference";
import { transcribeMath } from "./transcribe-math";

/** Registers the practice feature's long-running jobs. Step names map to common.job.steps labels. */

const AttemptInput = z.object({ attemptId: z.string() });

async function loadAttempt(db: Parameters<Parameters<typeof registerJob>[1]>[0]["db"], attemptId: string) {
  const [a] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
  if (!a) throw new Error("Attempt not found");
  const [q] = await db.select().from(questions).where(eq(questions.id, a.questionId));
  if (!q) throw new Error("Question not found");
  return { a, q };
}

// --- reference_understand: photo/text → Understanding (job.output.understanding)
registerJob("reference_understand", async (ctx) => {
  const input = z
    .object({ subject: SubjectSchema, uploadKeys: z.array(z.string()).default([]), text: z.string().optional() })
    .parse(ctx.input);
  const images = await ctx.step("load", () => getImagesForAi(input.uploadKeys));
  const understanding = await ctx.step("transcribe", () =>
    input.subject === "physics"
      ? understandPhysicsReference({ images, text: input.text, onUsage: ctx.onUsage })
      : understandReference({ subject: input.subject, images, text: input.text, onUsage: ctx.onUsage }),
  );
  return { understanding };
});

// --- reference_generate: Understanding → `count` private variants (job.output.questionIds)
registerJob("reference_generate", async (ctx) => {
  const input = ReferenceGenerateSchema.parse(ctx.input);
  const u = input.understanding;
  const questionIds: string[] = [];
  const titles: string[] = [];
  const failures: string[] = [];

  for (let i = 0; i < input.count; i++) {
    if (input.subject === "physics") {
      const preq: PhysicsGenerateRequest = {
        kind: toPhysicsKind(input.kind),
        topicIds: u.topicIds,
        difficulty: 3,
        extension: true,
        language: input.language,
        extra: physicsReferenceExtra(u, input.variation as VariationLevel, i, titles),
      };
      try {
        const { question, problems } = await generateCheckedPhysicsQuestion(preq, ctx.onUsage, ctx.step);
        const id = await ctx.step("save", () =>
          saveQuestion(ctx.db, { ...toNewPhysicsQuestion(preq, question, problems), ownerId: ctx.userId, origin: "reference_image" }),
        );
        questionIds.push(id);
        titles.push(question.title);
      } catch (e) {
        failures.push(e instanceof Error ? e.message : String(e));
      }
      continue;
    }
    const req: MathGenerateRequest = {
      subject: input.subject,
      kind: toMathKind(input.kind),
      topicIds: u.topicIds,
      difficulty: 3,
      extension: true,
      language: input.language,
      extra: referenceExtra(u, input.variation as VariationLevel, i, titles),
    };
    try {
      const draft = await ctx.step("generate", () => draftMathQuestion(req, ctx.onUsage));
      let q = draft.question;
      let problems = await ctx.step("check", async () => checkDraft(draft, req.kind));
      if (problems.length > 0) {
        const repaired = await ctx.step("repair", () => repairMathQuestion(req, q, problems, ctx.onUsage));
        const after = checkDraft(repaired, req.kind);
        if (after.length <= problems.length) {
          q = repaired.question;
          problems = after;
        }
      }
      const id = await ctx.step("save", () =>
        saveQuestion(ctx.db, { ...toNewQuestion(req, q, problems), ownerId: ctx.userId, origin: "reference_image" }),
      );
      questionIds.push(id);
      titles.push(q.title);
    } catch (e) {
      if (questionIds.length === 0 && i === input.count - 1) throw e;
      failures.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (questionIds.length === 0) throw new Error(failures[0] ?? "No question could be generated.");
  // Refund the variants that failed (the rest of the charge stands).
  const failed = input.count - questionIds.length;
  if (failed > 0) await refundCredits(ctx.db, ctx.userId, failed * CREDIT_COSTS.reference_generate, ctx.jobId, "refund_partial");
  return { questionIds, failed };
});

// --- transcribe_answer: photos → LaTeX lines → status review
registerJob("transcribe_answer", async (ctx) => {
  const { attemptId } = AttemptInput.parse(ctx.input);
  try {
    const { q, pages } = await ctx.step("load", async () => {
      const { q } = await loadAttempt(ctx.db, attemptId);
      const pages = await ctx.db.select().from(attemptPages).where(eq(attemptPages.attemptId, attemptId)).orderBy(attemptPages.pageNo);
      return { q, pages };
    });
    const images = await getImagesForAi(pages.map((p) => p.storageKey));
    const lines = await ctx.step("transcribe", () => transcribeMath({ images, questionStem: q.content.stem, onUsage: ctx.onUsage }));
    await ctx.step("save", () =>
      ctx.db.update(attempts).set({ aiTranscript: lines, editedTranscript: lines, edits: [], status: "review" }).where(eq(attempts.id, attemptId)),
    );
    return { attemptId, lines: lines.length };
  } catch (e) {
    await ctx.db.update(attempts).set({ status: "answering" }).where(eq(attempts.id, attemptId));
    throw e;
  }
});

// --- mark_answer: transcript + scheme → marks (AI) → code checks → store → learner profile
registerJob("mark_answer", async (ctx) => {
  const { attemptId } = AttemptInput.parse(ctx.input);
  try {
    const { a, q } = await ctx.step("load", () => loadAttempt(ctx.db, attemptId));
    const lines = a.editedTranscript ?? a.aiTranscript ?? [];
    const result = await ctx.step("mark", () => markMathAnswer({ content: q.content, lines, language: q.language, subject: q.subject, onUsage: ctx.onUsage }));
    const checked = await ctx.step("check", async () => ({ overrides: result.overrides }));
    await ctx.step("save", async () => {
      await ctx.db.delete(attemptMarks).where(eq(attemptMarks.attemptId, attemptId));
      await ctx.db.delete(attemptParts).where(eq(attemptParts.attemptId, attemptId));
      if (result.marks.length) await ctx.db.insert(attemptMarks).values(result.marks.map((m) => ({ ...m, attemptId })));
      if (result.parts.length) await ctx.db.insert(attemptParts).values(result.parts.map((p) => ({ ...p, attemptId })));
      await ctx.db
        .update(attempts)
        .set({ status: "marked", score: String(result.score), maxScore: String(result.maxScore), markedAt: new Date() })
        .where(eq(attempts.id, attemptId));
    });
    await ctx.step("profile", () =>
      recordAttemptResult(ctx.db, {
        userId: a.userId,
        subject: q.subject,
        attemptId,
        questionId: q.id,
        topicIds: q.topicIds,
        fraction: result.maxScore ? result.score / result.maxScore : 0,
        errorTags: result.errorTags,
      }),
    );
    return { attemptId, score: result.score, maxScore: result.maxScore, overrides: checked.overrides };
  } catch (e) {
    const [cur] = await ctx.db.select({ status: attempts.status }).from(attempts).where(eq(attempts.id, attemptId));
    if (cur?.status === "marking") await ctx.db.update(attempts).set({ status: "review" }).where(eq(attempts.id, attemptId));
    throw e;
  }
});
