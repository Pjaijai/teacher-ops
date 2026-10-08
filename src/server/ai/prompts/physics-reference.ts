import { z } from "zod";
import { UnderstandingSchema, type Understanding } from "@/lib/schemas/practice";
import type { PhysicsFigure } from "@/lib/schemas/physics-figure";
import { VARIATION_LEVELS, type VariationLevel } from "./math-reference";
import { PHYSICS_FIGURE_FORMATS, PHYSICS_FIGURE_RULES, PHYSICS_LATEX_RULES, parsePhysicsFigureJson, parsePhysicsGraphJson, topicList } from "./physics-rules";

/** Reference flow for Physics: read a photographed/typed physics question, then generate variants of it. */

export const AiPhysicsUnderstandingSchema = UnderstandingSchema.omit({ figure: true, graph: true }).extend({
  figureJson: z.string().describe('The reference figure as JSON in the PHYSICS FIGURE format, or "" if none / not supported'),
  graphJson: z.string().describe('A reference data/function graph as JSON in the GRAPH format, or ""'),
  figureDescription: z
    .string()
    .describe("Plain-text description of the reference figure with every value (components, distances, angles, forces), or \"\" if none"),
});

export type PhysicsUnderstanding = Understanding & { physicsFigure: PhysicsFigure | null };

export function physicsUnderstandingFromAi(u: z.infer<typeof AiPhysicsUnderstandingSchema>): { understanding: PhysicsUnderstanding; problems: string[] } {
  const { figureJson, graphJson, figureDescription, ...rest } = u;
  const fig = parsePhysicsFigureJson(figureJson);
  const graph = parsePhysicsGraphJson(graphJson);
  const desc = figureDescription.trim();
  // The figure travels back to the variants request as text: figureNote survives the student's edits and the request schema.
  const figureNote = rest.figureSupported ? (desc ? `Figure: ${desc}` : rest.figureNote) : rest.figureNote;
  return {
    understanding: { ...rest, figureNote, figure: null, graph: graph.value, physicsFigure: fig.value },
    problems: [...fig.problems, ...graph.problems],
  };
}

export function physicsUnderstandSystem() {
  return `You help a Hong Kong student who photographed or typed an HKDSE Physics question (worksheet, textbook or past
paper) and wants new practice questions like it. Read the reference question precisely and describe it so that variants
can be generated.

Topics:
${topicList()}

- questionText: the reference question transcribed faithfully, Markdown with LaTeX in $…$; keep parts (a), (b) and data tables.
- language: "zh" for Chinese, "en" for English.
- kind: "mc" if it has options A–D; "experiment" if it is about an experiment's design or data; "short" if it has
  1–2 parts worth ≤ 6 marks; else "long".
- topic: short topic name in the question language. topicIds: the 1–2 best matching topic ids (e.g. "PHY-IV-2").
- keyIdea: the physics principle and solution method being tested, in 1–3 sentences.
- figureJson / graphJson: the reference figure as JSON in the formats below, or "". If the student typed a description
  of a figure, build it from that. If the figure can't be expressed (field-line patterns, apparatus drawings, prisms,
  glass blocks, energy-level diagrams…), set figureSupported = false, figureJson = "" and say what is missing in figureNote.
- figureDescription: a plain-text description of the figure with all its values (always fill it when there is a figure).

${PHYSICS_LATEX_RULES}

${PHYSICS_FIGURE_RULES}

${PHYSICS_FIGURE_FORMATS}`;
}

export function physicsReferenceExtra(u: Understanding & { physicsFigure?: PhysicsFigure | null }, level: VariationLevel, index: number, previousTitles: string[]) {
  return `This question is a variant of a reference question supplied by the student.

Reference question:
${u.questionText}

Topic: ${u.topic}
Key idea: ${u.keyIdea}
${u.physicsFigure ? `Reference figure (structured): ${JSON.stringify(u.physicsFigure)}` : u.figureNote ? `Reference figure: ${u.figureNote}` : "Reference figure: none"}
Reference graph: ${u.graph ? JSON.stringify(u.graph) : "none"}

Variation level ${level} — ${VARIATION_LEVELS[level]}
${index > 0 ? `This is variant ${index + 1}. It must differ clearly from the earlier variants: ${previousTitles.join("; ")}.` : ""}`;
}
