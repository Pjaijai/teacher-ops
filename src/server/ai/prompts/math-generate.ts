import { z } from "zod";
import { QuestionContentSchema, type QuestionContent, type SymbolicCheck } from "@/lib/schemas/question";
import type { Subject } from "@/lib/subjects";
import {
  FIGURE_FORMATS,
  FIGURE_RULES,
  LATEX_RULES,
  MARKING_SCHEME_RULES,
  MATHJS_RULES,
  SYMBOLIC_RULES,
  languageRules,
  parseFigureJson,
  parseGraphJson,
  subjectProfile,
  unitDetail,
  unitList,
} from "./math-rules";

/** Flat (strict-schema friendly) form of a SymbolicCheck: the domain tuple is split into two numbers. */
const AiSymbolicCheckSchema = z.object({
  part: z.string().describe("markingScheme part label this check verifies"),
  kind: z.enum(["derivative", "integral", "definite_integral", "identity", "limit", "sum"]),
  expr: z.string().describe("mathjs expression in `variable`: the function / integrand / left side / limit expression / general term"),
  claimed: z.string().describe("mathjs expression for the claimed result: derivative, antiderivative, exact value, right side, limit, sum"),
  variable: z.string().describe('The single variable, e.g. "x", "t", "h", "k"'),
  lower: z.number().nullable().describe("definite_integral/sum: lower limit; limit: the point approached (null = infinity); else null"),
  upper: z.number().nullable().describe("definite_integral/sum: upper limit (sum: null for a closed form in the last index); else null"),
  domainMin: z.number().describe("Sample interval start, inside the domain of both expressions"),
  domainMax: z.number().describe("Sample interval end"),
});
type AiSymbolicCheck = z.infer<typeof AiSymbolicCheckSchema>;

/**
 * What the model returns. The figure and graph come back as JSON strings: with them as nested strict-schema
 * objects the provider's compiled grammar is too large. They're parsed and validated by code (fromAi).
 */
const AiContentSchema = QuestionContentSchema.omit({ figure: true, graph: true, materials: true, writing: true, symbolicChecks: true, physicsFigure: true }).extend({
  figureJson: z.string().describe('The figure as JSON in the FIGURE format, or "" when no figure is needed'),
  graphJson: z.string().describe('The function graph as JSON in the GRAPH format, or "" when no graph is needed'),
  symbolicChecks: z.array(AiSymbolicCheckSchema).describe("M1/M2: one per symbolic answer or printed target (see the rules); [] for Compulsory Part"),
});
export const AiGeneratedMathQuestionSchema = z.object({
  title: z.string().describe("Short title for lists and search, e.g. \"Variation: partly constant, partly varies as x²\" (in the question language)"),
  archetype: z.string().describe('Archetype code from the design notes (e.g. "P8", "S3", "C7", "MC-slip") or a short kebab name'),
  topicIds: z.array(z.string()).describe("Learning Unit ids this question tests, e.g. [\"CP-6\"] or [\"M1-8\"]"),
  content: AiContentSchema,
});
export type AiGeneratedMathQuestion = z.infer<typeof AiGeneratedMathQuestionSchema>;

export type GeneratedMathQuestion = { title: string; archetype: string; topicIds: string[]; content: QuestionContent };

const fromAiCheck = ({ domainMin, domainMax, ...c }: AiSymbolicCheck): SymbolicCheck => ({ ...c, domain: [domainMin, domainMax] });
const toAiCheck = ({ domain, ...c }: SymbolicCheck): AiSymbolicCheck => ({ ...c, domainMin: domain[0], domainMax: domain[1] });

/** Parse the model's figure/graph strings. Problems (invalid JSON or shape) go to the checker's list. */
export function fromAi(q: AiGeneratedMathQuestion): { question: GeneratedMathQuestion; parseProblems: string[] } {
  const { figureJson, graphJson, symbolicChecks, ...rest } = q.content;
  const figure = parseFigureJson(figureJson);
  const graph = parseGraphJson(graphJson);
  return {
    question: {
      title: q.title,
      archetype: q.archetype,
      topicIds: q.topicIds,
      content: { ...rest, figure: figure.value, graph: graph.value, materials: null, writing: null, symbolicChecks: (symbolicChecks ?? []).map(fromAiCheck) },
    },
    parseProblems: [...figure.problems, ...graph.problems],
  };
}

function toAi(q: GeneratedMathQuestion): AiGeneratedMathQuestion {
  const { figure, graph, materials: _m, writing: _w, symbolicChecks, physicsFigure: _p, ...rest } = q.content;
  return {
    ...q,
    content: {
      ...rest,
      figureJson: figure ? JSON.stringify(figure) : "",
      graphJson: graph ? JSON.stringify(graph) : "",
      symbolicChecks: (symbolicChecks ?? []).map(toAiCheck),
    },
  };
}

const KIND_TEXT = {
  mc: "multiple choice (Paper 2 style): exactly 4 options A–D, one key, three distractors each from ONE named slip; 1 mark",
  short: "short conventional question (Paper 1 Section A(1) style): 1–2 parts, 3–5 marks in total, written working",
  long: "long conventional question (Paper 1 Section A(2)/B style): 2–4 chained parts, 6–12 marks in total, written working",
} as const;
export type MathKind = keyof typeof KIND_TEXT;

const EXTENDED_KIND_TEXT: Record<"math_m1" | "math_m2", Record<MathKind, string>> = {
  math_m1: {
    mc: "multiple choice (not in the M1 paper; practice item): exactly 4 options A–D, one key, three distractors each from ONE named slip; 1 mark",
    short: "Section A short question: 2–3 parts, 5–8 marks in total, written working",
    long: "Section B long question: 3–5 chained parts telling one story, 11–14 marks in total, written working",
  },
  math_m2: {
    mc: "multiple choice (not in the M2 paper; practice item): exactly 4 options A–D, one key, three distractors each from ONE named slip; 1 mark",
    short: "Section A short question: 1–3 parts, 4–8 marks in total, written working",
    long: "Section B long question: 3–5 chained parts (a staircase), 12–13 marks in total, written working",
  },
};

function kindText(subject: Subject, kind: MathKind) {
  return subject === "math_m1" || subject === "math_m2" ? EXTENDED_KIND_TEXT[subject][kind] : KIND_TEXT[kind];
}

const DIFFICULTY_TEXT: Record<number, string> = {
  1: "1/5 — routine, one idea, Level 2 standard",
  2: "2/5 — standard Section A item, Level 3",
  3: "3/5 — typical DSE item with one trap, Level 4",
  4: "4/5 — Section B, two ideas combined, Level 5",
  5: "5/5 — hardest Section B item, several ideas, Level 5**",
};

export function generateSystem(subject: Subject, language: "zh" | "en") {
  const profile = subjectProfile(subject);
  return `You write original practice questions for ${profile.name} students in Hong Kong. Every question must look and
feel like a real HKDSE question, but must be NEW (never copy a past-paper question).

${profile.designNotes}

Accuracy: ${profile.accuracy}

${languageRules(language, subject)}

${LATEX_RULES}

${MATHJS_RULES}

${profile.symbolic ? SYMBOLIC_RULES : "symbolicChecks: always [] for this subject."}

${MARKING_SCHEME_RULES}

${FIGURE_RULES}

${FIGURE_FORMATS}

Content fields:
- stem: the full question as printed, with parts "(a)", "(b)(i)" on new lines and the marks of each part not shown.
- figureJson / graphJson: the figure or graph as a JSON string in the formats above, or "" for none.
- options/correctOption/distractorNotes: MC only (else [] / null / []).
  MC procedure: (1) solve the question; (2) pick three DIFFERENT named slips from the recipe and work each one through
  with the same numbers to get its wrong value; (3) write the four options in ascending order for numbers and set the key.
  The MC stem asks exactly ONE question — no leftover or duplicate question sentences.
  distractorNotes: one per wrong option. misconception = ONE clear sentence (question language) naming the slip and the
  wrong working that produces exactly that option, e.g. "Inverted the slope as $\frac{x_2-x_1}{y_2-y_1}$, so $c = 5$."
  tag = short English kebab-case slip name (e.g. "forgot-plus-minus", "inverted-ratio", "percentage-base").
  Vary which letter is the key.
- solution: worked solution in DSE marking-scheme style, one step per line, with reasons for geometry.
- taskAnalysis (解題): 3–6 sentences — how to read the question, what each part gives the next, and the key idea
  that unlocks it. No full solution here.
- tips: 2–4 short tips and the traps students fall into on this question.
Solve the question yourself before writing it, and make sure every number is consistent.${
    profile.symbolic
      ? `
Before returning, differentiate/integrate/expand again yourself and make sure every symbolicChecks entry is TRUE —
the program rejects the question if any claimed result is wrong.`
      : ""
  }`;
}

export function generateUserPrompt(opts: {
  subject: Subject;
  kind: MathKind;
  topicIds: string[];
  difficulty: number;
  extension: boolean;
  extra?: string;
}) {
  const profile = subjectProfile(opts.subject);
  const topics = opts.topicIds.length
    ? `Topic(s) — test these Learning Units:\n${unitDetail(profile, opts.topicIds)}`
    : `Topic: choose one Learning Unit that suits the requested type (vary your choice), from:\n${unitList(profile)}`;
  return `${topics}

Question type: ${kindText(opts.subject, opts.kind)}
Difficulty: ${DIFFICULTY_TEXT[opts.difficulty] ?? DIFFICULTY_TEXT[3]}
${opts.subject === "math_cp" ? (opts.extension ? "Non-foundation topics are allowed." : "Prefer Foundation Topics (FT) unless the chosen unit is NFT.") : ""}
${opts.extra ?? ""}
Pick a fitting archetype from the design notes, build in one typical trap, and return the question.`;
}

export function repairPrompt(question: GeneratedMathQuestion, problems: string[]) {
  return `This question failed an automatic check. Return a corrected version that fixes EVERY problem listed. Keep the
question otherwise the same where possible (same archetype, topic and language). Recompute every value.

Question:
${JSON.stringify(toAi(question))}

Problems found by the checker:
${problems.map((p) => `- ${p}`).join("\n")}`;
}
