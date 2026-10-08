import { z } from "zod";
import { UnderstandingSchema, type Understanding } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import { FIGURE_FORMATS, FIGURE_RULES, LATEX_RULES, parseFigureJson, parseGraphJson, subjectProfile, unitList } from "./math-rules";

/** Model-facing shape: figure/graph as JSON strings (nested strict schemas make the grammar too large). */
export const AiUnderstandingSchema = UnderstandingSchema.omit({ figure: true, graph: true }).extend({
  figureJson: z.string().describe('The reference figure as JSON in the FIGURE format, or "" if none / not supported'),
  graphJson: z.string().describe('The reference function graph as JSON in the GRAPH format, or "" if none'),
});

export function understandingFromAi(u: z.infer<typeof AiUnderstandingSchema>): { understanding: Understanding; problems: string[] } {
  const { figureJson, graphJson, ...rest } = u;
  const figure = parseFigureJson(figureJson);
  const graph = parseGraphJson(graphJson);
  return { understanding: { ...rest, figure: figure.value, graph: graph.value }, problems: [...figure.problems, ...graph.problems] };
}

/** Variation levels for questions made from a reference question. */
export const VARIATION_LEVELS = {
  1: "Number swap: keep the same wording, structure and figure shape; change only the numbers. Choose numbers that give clean answers (e.g. Pythagorean triples, factorable quadratics, exact table entries for normal look-ups) or answers to the paper's stated accuracy.",
  2: "Context swap: keep the same mathematics and solution method but use a new setting (a different real-life context or a different geometric configuration), with a matching new figure.",
  3: "Structure variant: same concept, but change what is unknown (e.g. find a side instead of an angle, work backwards), or add one extra step or part (e.g. a 'hence' part or a verdict part).",
} as const;
export type VariationLevel = keyof typeof VARIATION_LEVELS;

export function understandSystem(subject: Subject) {
  const profile = subjectProfile(subject);
  return `You help a Hong Kong student who photographed or typed a maths question (from a worksheet, textbook or
past paper) and wants new practice questions like it. Read the reference question precisely and describe it so
that variants can be generated.

Subject: ${profile.name}. Learning Units:
${unitList(profile)}

- questionText: the reference question transcribed faithfully, as Markdown with LaTeX in $…$; keep parts (a), (b).
- language: the language of the reference question ("zh" for Chinese, "en" for English).
- kind: "mc" if it has options A–D; "short" if it is a 1–2 part question worth ≤ 5 marks; else "long".
- topic: short topic name in the question language. topicIds: the 1–2 best matching Learning Unit ids.
- keyIdea: the mathematical idea and the solution method being tested, in 1–3 sentences.
- figureJson / graphJson: the reference figure or function graph as a JSON string in the formats below, or "". If the student typed a description of a
  figure instead of an image, build the figure from that description. Curves y = f(x) (with asymptotes and shaded
  regions) go in graphJson. If the figure is not supported (3D solids, curves you can't write as y = f(x), statistical
  charts), set figureSupported = false, figureJson = "" and explain in figureNote.

${LATEX_RULES}

${FIGURE_RULES}

${FIGURE_FORMATS}`;
}

export function understandUserPrompt(text: string | undefined, imageCount: number) {
  const parts = [];
  if (imageCount) parts.push(`The reference question is in the ${imageCount === 1 ? "image" : `${imageCount} images`} above.`);
  if (text?.trim()) parts.push(`The student typed:\n${text.trim()}`);
  return parts.join("\n\n");
}

export function referenceExtra(u: Understanding, level: VariationLevel, index: number, previousTitles: string[]) {
  return `This question is a variant of a reference question supplied by the student.

Reference question:
${u.questionText}

Topic: ${u.topic}
Key idea: ${u.keyIdea}
Reference figure (structured): ${u.figure ? JSON.stringify(u.figure) : "none"}
Reference graph: ${u.graph ? JSON.stringify(u.graph) : "none"}

Variation level ${level} — ${VARIATION_LEVELS[level]}
${index > 0 ? `This is variant ${index + 1}. It must differ clearly from the earlier variants: ${previousTitles.join("; ")}.` : ""}`;
}
