import { and, eq } from "drizzle-orm";
import { stripMarkers, textLength } from "@/features/writing/lib/text-markers";
import { writingTaskBlock } from "@/server/ai/prompts/writing-task";
import { levelSamples, submissionPages, writingEstimates, writingFeedback, writingScores, writingSubmissions } from "@/server/db/schema";
import { registerJob, type JobContext } from "@/server/jobs/job-runner";
import { recordWritingResult } from "@/server/services/learner/learner-events";
import { markViewed } from "@/server/services/questions/question-bank";
import { getImagesForAi } from "@/server/storage/storage";
import { chineseFeedback, type FeedbackDraft } from "./chinese-feedback";
import { estimateChinese, type EstimateResult } from "./chinese-estimate";
import { estimateEnglish } from "./english-estimate";
import { englishFeedback } from "./english-feedback";
import { writeLevelSample } from "./level-sample";
import { checkScript } from "./script-check";
import { transcribeWriting } from "./transcribe-writing";
import { asWritingSubject, canonicalPart, essayText, loadOwnSubmission, loadSubmissionQuestion } from "./writing-common";

const submissionIdOf = (ctx: JobContext) => String(ctx.input.submissionId ?? ctx.resourceRef);

/** transcribe_writing: photos → exact transcription (aiText) → status review. */
registerJob("transcribe_writing", async (ctx) => {
  const id = submissionIdOf(ctx);
  try {
    const { s, subject, images } = await ctx.step("load", async () => {
      const s = await loadOwnSubmission(ctx.db, ctx.userId, id);
      const q = await loadSubmissionQuestion(ctx.db, s);
      const pages = await ctx.db.select().from(submissionPages).where(eq(submissionPages.submissionId, id)).orderBy(submissionPages.pageNo);
      return { s, subject: asWritingSubject(q.subject), images: await getImagesForAi(pages.map((p) => p.storageKey)) };
    });
    const t = await ctx.step("transcribe", () => transcribeWriting({ subject, images, onUsage: ctx.onUsage }));
    await ctx.step("save", async () => {
      const text = t.title ? `${t.title}\n\n${t.text}` : t.text;
      const clean = stripMarkers(text).clean;
      await ctx.db
        .update(writingSubmissions)
        .set({ aiText: text, editedText: text, edits: [], status: "review", charCount: textLength(clean, subject) })
        .where(eq(writingSubmissions.id, s.id));
    });
    return { submissionId: id };
  } catch (e) {
    await ctx.db.update(writingSubmissions).set({ status: "transcribe_failed" }).where(eq(writingSubmissions.id, id));
    throw e;
  }
});

/**
 * writing_feedback: 繁簡 check (code) → AI feedback (top) → [DSE estimate with anchors] → save → profile.
 * On failure the submission goes back to review (the credits are refunded by the runner).
 */
registerJob("writing_feedback", async (ctx) => {
  const id = submissionIdOf(ctx);
  const wantsEstimate = Boolean(ctx.input.wantsEstimate);
  try {
    const { s, q } = await ctx.step("load", async () => {
      const s = await loadOwnSubmission(ctx.db, ctx.userId, id);
      return { s, q: await loadSubmissionQuestion(ctx.db, s) };
    });
    const subject = asWritingSubject(q.subject);
    const part = canonicalPart(q);
    const essay = essayText(s);
    const task = writingTaskBlock(q);
    const script = subject === "chi_writing" ? checkScript(essay.clean) : null;

    const fb = await ctx.step("feedback", async () => {
      if (subject === "chi_writing") return chineseFeedback({ essay, task, script: script!, onUsage: ctx.onUsage });
      const r = await englishFeedback({ text: essay.clean, task, onUsage: ctx.onUsage });
      return { rows: r.rows, wrongChars: [] };
    });

    let estimate: EstimateResult | null = null;
    if (wantsEstimate) {
      estimate = await ctx.step("estimate", () =>
        subject === "chi_writing"
          ? estimateChinese({ db: ctx.db, text: essay.clean, task, genre: q.content.writing?.genre ?? null, wrongChars: fb.wrongChars, onUsage: ctx.onUsage })
          : estimateEnglish({
              db: ctx.db,
              text: essay.clean,
              task,
              part,
              textType: q.content.writing?.textType ?? null,
              wordGuide: q.content.writing?.wordLimit ?? null,
              onUsage: ctx.onUsage,
            }),
      );
    }

    await ctx.step("save", () => saveFeedback(ctx, id, fb.rows, estimate, script?.dominant ?? null, textLength(essay.clean, subject)));

    await ctx.step("profile", async () => {
      try {
        await markViewed(ctx.db, ctx.userId, q.id, { attempted: true });
        await recordWritingResult(ctx.db, {
          userId: ctx.userId,
          subject,
          part,
          submissionId: id,
          questionId: q.id,
          criterionScores: Object.fromEntries((estimate?.scores ?? []).map((r) => [r.criterion, r.maxMarks ? r.marks / r.maxMarks : 0])),
          errorTags: fb.rows.flatMap((r) => r.tags ?? []),
        });
      } catch (e) {
        // The feedback is saved; a profile update failure shouldn't fail the student's job.
        console.warn("learner profile update failed:", e instanceof Error ? e.message : e);
      }
    });
    return { submissionId: id };
  } catch (e) {
    await ctx.db.update(writingSubmissions).set({ status: "review" }).where(and(eq(writingSubmissions.id, id), eq(writingSubmissions.status, "grading")));
    throw e;
  }
});

async function saveFeedback(
  ctx: JobContext,
  id: string,
  rows: FeedbackDraft[],
  estimate: EstimateResult | null,
  dominantScript: "trad" | "simp" | null,
  length: number,
) {
  const db = ctx.db;
  // Re-runs (a retried Workflow step) replace earlier rows.
  await db.delete(writingFeedback).where(eq(writingFeedback.submissionId, id));
  await db.delete(writingScores).where(eq(writingScores.submissionId, id));
  await db.delete(writingEstimates).where(eq(writingEstimates.submissionId, id));
  if (rows.length) await db.insert(writingFeedback).values(rows.map((r) => ({ ...r, submissionId: id })));
  if (estimate) {
    await db.insert(writingScores).values(
      estimate.scores.map((r) => ({
        submissionId: id,
        part: estimate.part,
        criterion: r.criterion,
        grade: r.grade,
        marks: String(r.marks),
        maxMarks: String(r.maxMarks),
        reason: r.reason,
        anchorIds: r.anchorIds,
      })),
    );
    await db.insert(writingEstimates).values({
      submissionId: id,
      totalMarks: String(estimate.totalMarks),
      maxMarks: String(estimate.maxMarks),
      level: estimate.level,
      levelReason: estimate.levelReason,
    });
  }
  const overall = rows.find((r) => r.kind === "overall")?.payload as { comment?: string } | undefined;
  await db
    .update(writingSubmissions)
    .set({ status: "graded", dominantScript, charCount: length, overallComment: overall?.comment ?? null })
    .where(eq(writingSubmissions.id, id));
}

/** level_sample: load essay + feedback → rewrite at the target level → save with change notes. */
registerJob("level_sample", async (ctx) => {
  const id = submissionIdOf(ctx);
  const targetLevel = Number(ctx.input.targetLevel ?? 4);
  const { s, q, summary } = await ctx.step("load", async () => {
    const s = await loadOwnSubmission(ctx.db, ctx.userId, id);
    const q = await loadSubmissionQuestion(ctx.db, s);
    const fb = await ctx.db.select().from(writingFeedback).where(eq(writingFeedback.submissionId, id));
    const summary = fb
      .filter((f) => ["task_recap", "problem_sentence", "eng_error", "overall"].includes(f.kind))
      .slice(0, 30)
      .map((f) => `- ${f.kind}: ${JSON.stringify(f.payload)}`)
      .join("\n");
    return { s, q, summary };
  });
  const subject = asWritingSubject(q.subject);
  const sample = await ctx.step("sample", () =>
    writeLevelSample({
      subject,
      targetLevel,
      task: writingTaskBlock(q),
      text: essayText(s).clean,
      feedbackSummary: summary,
      script: (s.dominantScript as "trad" | "simp" | null) ?? null,
      onUsage: ctx.onUsage,
    }),
  );
  const sampleId = await ctx.step("save", async () => {
    const [row] = await ctx.db
      .insert(levelSamples)
      .values({ submissionId: id, targetLevel, text: sample.text, changes: sample.changes })
      .returning({ id: levelSamples.id });
    return row.id;
  });
  return { submissionId: id, sampleId };
});
