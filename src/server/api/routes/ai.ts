import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { stripMarkers, textLength } from "@/features/writing/lib/text-markers";
import {
  AiGenerateSchema,
  AiPracticeMarkSchema,
  AiPracticeTranscribeSchema,
  AiPracticeUnderstandSchema,
  AiWritingFeedbackSchema,
  AiWritingHelperSchema,
  AiWritingSampleSchema,
  AiWritingTranscribeSchema,
  type QuestionLite,
} from "@/lib/schemas/ai";
import { ReferenceGenerateSchema } from "@/lib/schemas/practice";
import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { referenceExtra, type VariationLevel } from "@/server/ai/prompts/math-reference";
import { physicsReferenceExtra } from "@/server/ai/prompts/physics-reference";
import { HELPER_SCHEMAS, helperSystem } from "@/server/ai/prompts/writing-helpers";
import { writingTaskBlock } from "@/server/ai/prompts/writing-task";
import { invalid } from "@/server/errors";
import { checkDraft, draftMathQuestion, repairMathQuestion, toMathKind, toNewQuestion, type MathGenerateRequest } from "@/server/services/practice/generate-math-question";
import {
  generateCheckedPhysicsQuestion,
  toNewPhysicsQuestion,
  toPhysicsKind,
  understandPhysicsReference,
  type PhysicsGenerateRequest,
} from "@/server/services/practice/generate-physics-question";
import { markMathAnswer } from "@/server/services/practice/mark-answer";
import { understandReference } from "@/server/services/practice/reference-understand";
import { transcribeMath } from "@/server/services/practice/transcribe-math";
import { getGenerator } from "@/server/services/questions/generators";
import type { NewQuestion } from "@/server/services/questions/question-bank";
import { chineseFeedback } from "@/server/services/writing/chinese-feedback";
import { estimateChinese, type EstimateResult } from "@/server/services/writing/chinese-estimate";
import { estimateEnglish } from "@/server/services/writing/english-estimate";
import { englishFeedback } from "@/server/services/writing/english-feedback";
import { writeLevelSample } from "@/server/services/writing/level-sample";
import { checkScript } from "@/server/services/writing/script-check";
import { transcribeWriting } from "@/server/services/writing/transcribe-writing";
import { asWritingSubject, canonicalPart, estimateAllowed } from "@/server/services/writing/writing-common";
import { streamWork } from "../ai-stream";
import type { AppEnv } from "../context";
import { rateLimit } from "../middleware/rate-limit";

/**
 * Stateless AI API (local mode): no sign-in, no database. Every request carries what the model
 * needs (the question, the essay, the photos) and the browser stores the result.
 * Long calls stream progress as Server-Sent Events (see ai-stream.ts).
 */
const noUsage: UsageSink = () => {};

/** The fields of a generated question the browser keeps. */
function toLite(q: Omit<NewQuestion, "embedding">) {
  return {
    subject: q.subject,
    kind: q.kind,
    title: q.title,
    part: q.part ?? null,
    language: q.language,
    topicIds: q.topicIds,
    difficulty: q.difficulty ?? 3,
    extension: q.extension ?? false,
    content: q.content,
    checkProblems: q.checkProblems,
  };
}

const writingQuestion = (q: QuestionLite) => {
  const subject = asWritingSubject(q.subject);
  return { subject, part: canonicalPart(q), task: writingTaskBlock(q) };
};

export const aiRoutes = new Hono<AppEnv>()
  .use("*", rateLimit(120))

  // --- Questions (writing tasks and maths), via the registered generators
  .post("/questions/generate", zValidator("json", AiGenerateSchema), (c) => {
    const input = c.req.valid("json");
    return streamWork(c, async (step) => {
      const generate = await getGenerator(input.subject);
      if (!generate) throw new Error(`Question generation for ${input.subject} isn't available yet.`);
      const q = await generate({ input, step, onUsage: noUsage });
      return { question: toLite(q) };
    });
  })

  // --- Writing
  .post("/writing/helper", zValidator("json", AiWritingHelperSchema), async (c) => {
    const { question, kind } = c.req.valid("json");
    const { subject, task } = writingQuestion(question);
    const content = await askStructured({
      purpose: `writing_helper_${kind}`,
      tier: "light",
      system: helperSystem(kind, subject),
      text: task,
      schema: HELPER_SCHEMAS[kind],
    });
    return c.json({ kind, content });
  })
  .post("/writing/transcribe", zValidator("json", AiWritingTranscribeSchema), (c) => {
    const { subject, images } = c.req.valid("json");
    return streamWork(c, async (step) => {
      const t = await step("transcribe", () => transcribeWriting({ subject, images, onUsage: noUsage }));
      const text = t.title ? `${t.title}\n\n${t.text}` : t.text;
      return { text, charCount: textLength(stripMarkers(text).clean, subject) };
    });
  })
  .post("/writing/feedback", zValidator("json", AiWritingFeedbackSchema), (c) => {
    const { question, text, wantsEstimate } = c.req.valid("json");
    const { subject, part, task } = writingQuestion(question);
    if (wantsEstimate && !estimateAllowed(subject, part)) throw invalid("A DSE estimate isn't available for Chinese 甲部 yet.");
    return streamWork(c, async (step) => {
      const essay = stripMarkers(text);
      const script = subject === "chi_writing" ? checkScript(essay.clean) : null;
      const fb = await step("feedback", async () => {
        if (subject === "chi_writing") return chineseFeedback({ essay, task, script: script!, onUsage: noUsage });
        const r = await englishFeedback({ text: essay.clean, task, onUsage: noUsage });
        return { rows: r.rows, wrongChars: [] as { wrong: string; correct: string }[] };
      });
      let estimate: EstimateResult | null = null;
      if (wantsEstimate) {
        estimate = await step("estimate", () =>
          subject === "chi_writing"
            ? estimateChinese({ db: null, text: essay.clean, task, genre: question.content.writing?.genre ?? null, wrongChars: fb.wrongChars, onUsage: noUsage })
            : estimateEnglish({
                db: null,
                text: essay.clean,
                task,
                part,
                textType: question.content.writing?.textType ?? null,
                wordGuide: question.content.writing?.wordLimit ?? null,
                onUsage: noUsage,
              }),
        );
      }
      const overall = fb.rows.find((r) => r.kind === "overall")?.payload as { comment?: string } | undefined;
      return {
        rows: fb.rows,
        estimate,
        dominantScript: script?.dominant ?? null,
        charCount: textLength(essay.clean, subject),
        overallComment: overall?.comment ?? null,
      };
    });
  })
  .post("/writing/sample", zValidator("json", AiWritingSampleSchema), (c) => {
    const body = c.req.valid("json");
    const { subject, task } = writingQuestion(body.question);
    return streamWork(c, async (step) =>
      step("sample", () =>
        writeLevelSample({
          subject,
          targetLevel: body.targetLevel,
          task,
          text: stripMarkers(body.text).clean,
          feedbackSummary: body.feedbackSummary,
          script: body.script,
          onUsage: noUsage,
        }),
      ),
    );
  })

  // --- Practice (maths)
  .post("/practice/understand", zValidator("json", AiPracticeUnderstandSchema), (c) => {
    const { subject, images, text } = c.req.valid("json");
    return streamWork(c, async (step) => ({
      understanding: await step("transcribe", () =>
        subject === "physics" ? understandPhysicsReference({ images, text, onUsage: noUsage }) : understandReference({ subject, images, text, onUsage: noUsage }),
      ),
    }));
  })
  .post("/practice/variants", zValidator("json", ReferenceGenerateSchema), (c) => {
    const input = c.req.valid("json");
    return streamWork(c, async (step) => {
      const u = input.understanding;
      const out: ReturnType<typeof toLite>[] = [];
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
            const { question, problems } = await generateCheckedPhysicsQuestion(preq, noUsage, step);
            out.push(toLite(toNewPhysicsQuestion(preq, question, problems)));
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
          const draft = await step("generate", () => draftMathQuestion(req, noUsage));
          let q = draft.question;
          let problems = await step("check", async () => checkDraft(draft, req.kind));
          if (problems.length > 0) {
            const repaired = await step("repair", () => repairMathQuestion(req, q, problems, noUsage));
            const after = checkDraft(repaired, req.kind);
            if (after.length <= problems.length) {
              q = repaired.question;
              problems = after;
            }
          }
          out.push(toLite(toNewQuestion(req, q, problems)));
          titles.push(q.title);
        } catch (e) {
          failures.push(e instanceof Error ? e.message : String(e));
        }
      }
      if (out.length === 0) throw new Error(failures[0] ?? "No question could be generated.");
      return { questions: out, failed: input.count - out.length };
    });
  })
  .post("/practice/transcribe", zValidator("json", AiPracticeTranscribeSchema), (c) => {
    const { images, questionStem } = c.req.valid("json");
    return streamWork(c, async (step) => ({
      lines: await step("transcribe", () => transcribeMath({ images, questionStem, onUsage: noUsage })),
    }));
  })
  .post("/practice/mark", zValidator("json", AiPracticeMarkSchema), (c) => {
    const { question, lines } = c.req.valid("json");
    return streamWork(c, async (step) => {
      const r = await step("mark", () => markMathAnswer({ content: question.content, lines, language: question.language, subject: question.subject, onUsage: noUsage }));
      return { marks: r.marks, parts: r.parts, score: r.score, maxScore: r.maxScore, errorTags: r.errorTags, overrides: r.overrides };
    });
  });
