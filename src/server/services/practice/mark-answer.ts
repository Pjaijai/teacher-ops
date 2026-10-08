import { MarkingOutputSchema } from "@/lib/schemas/practice";
import type { QuestionContent } from "@/lib/schemas/question";
import type { Subject } from "@/lib/subjects";
import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { markSystem, markUserPrompt } from "@/server/ai/prompts/math-mark";
import { normaliseMarking } from "./normalise-marking";

/**
 * Mark the student's (edited) transcript against the scheme (top model), then apply code checks.
 * The subject picks the conventions: maths by default, HKEAA Physics rules (units, keywords, e.c.f.) for physics.
 */
export async function markMathAnswer(opts: {
  content: QuestionContent;
  lines: { latex: string }[];
  language: "zh" | "en";
  subject?: Subject;
  onUsage?: UsageSink;
}) {
  const output = await askStructured({
    purpose: opts.subject === "physics" ? "mark_answer_physics" : "mark_answer",
    tier: "top",
    system: markSystem(opts.language, opts.subject),
    text: markUserPrompt(opts.content, opts.lines),
    schema: MarkingOutputSchema,
    onUsage: opts.onUsage,
  });
  return { output, ...normaliseMarking(opts.content, output, opts.lines.length, opts.language, opts.subject) };
}
