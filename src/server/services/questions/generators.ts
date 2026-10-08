import type { NextQuestionInput } from "@/lib/schemas/question";
import type { Subject } from "@/lib/subjects";
import type { UsageSink } from "@/server/ai/open-router";
import type { StepRunner } from "@/server/jobs/job-runner";
import type { NewQuestion } from "./question-bank";

/**
 * Each subject family plugs its question generator in here. The question-bank service calls it
 * (inside a `generate_question` job) when no unseen bank question fits a request.
 */
export type GenerateContext = {
  input: NextQuestionInput & { language: "zh" | "en" };
  step: StepRunner;
  onUsage: UsageSink;
};
export type QuestionGenerator = (ctx: GenerateContext) => Promise<Omit<NewQuestion, "embedding">>;

const generators = new Map<Subject, QuestionGenerator>();

export function registerGenerator(subjects: Subject[], fn: QuestionGenerator) {
  for (const s of subjects) generators.set(s, fn);
}

export async function getGenerator(subject: Subject): Promise<QuestionGenerator | undefined> {
  // Feature modules register themselves on import.
  await import("./generator-registry");
  return generators.get(subject);
}
