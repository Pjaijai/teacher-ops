import { NextQuestionSchema } from "@/lib/schemas/question";
import { embedOne } from "@/server/ai/embed";
import { registerJob } from "@/server/jobs/job-runner";
import { getGenerator } from "./generators";
import { saveQuestion } from "./question-bank";

/** generate_question: generate → check → save into the bank (embedding is best effort). */
registerJob("generate_question", async (ctx) => {
  const parsed = NextQuestionSchema.extend({ language: NextQuestionSchema.shape.language.unwrap().default("en") }).parse(ctx.input);
  const input = { ...parsed, language: parsed.language };
  const generator = await getGenerator(input.subject);
  if (!generator) throw new Error(`No question generator for ${input.subject}`);

  const generated = await ctx.step("generate", () => generator({ input, step: ctx.step, onUsage: ctx.onUsage }));
  const problems = await ctx.step("check", async () => generated.checkProblems);
  void problems;
  const questionId = await ctx.step("save", async () => {
    let embedding: number[] | null = null;
    try {
      embedding = await embedOne(`${generated.title}\n${generated.content.stem}`);
    } catch (e) {
      console.warn("embedding skipped:", e instanceof Error ? e.message : e);
    }
    return saveQuestion(ctx.db, { ...generated, embedding });
  });
  return { questionId };
});
