import type { Understanding } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import { askStructured, type ImageInput, type UsageSink } from "@/server/ai/open-router";
import { subjectProfile } from "@/server/ai/prompts/math-rules";
import { AiUnderstandingSchema, understandingFromAi, understandSystem, understandUserPrompt } from "@/server/ai/prompts/math-reference";
import { checkDiagram } from "@/lib/diagram/check-diagram";

/** Top model reads a reference question (photo and/or typed text) and says what it understood. */
export async function understandReference(opts: {
  subject: Subject;
  images: ImageInput[];
  text?: string;
  onUsage?: UsageSink;
}): Promise<Understanding & { figureProblems: string[] }> {
  const raw = await askStructured({
    purpose: "reference_understand",
    tier: "top",
    system: understandSystem(opts.subject),
    text: understandUserPrompt(opts.text, opts.images.length),
    images: opts.images,
    schema: AiUnderstandingSchema,
    onUsage: opts.onUsage,
  });
  const { understanding: u, problems } = understandingFromAi(raw);
  const known = new Set(subjectProfile(opts.subject).units.map((x) => x.id));
  const topicIds = [...new Set(u.topicIds.map((t) => t.trim().split(".")[0]))].filter((t) => known.has(t));
  return { ...u, topicIds, figureProblems: [...problems, ...(u.figure ? checkDiagram(u.figure) : [])] };
}
