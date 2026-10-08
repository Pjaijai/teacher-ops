import type { Subject } from "@/lib/subjects";
import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { modelFor } from "@/server/ai/models";
import {
  AiGeneratedMathQuestionSchema,
  fromAi,
  generateSystem,
  generateUserPrompt,
  repairPrompt,
  type GeneratedMathQuestion,
  type MathKind,
} from "@/server/ai/prompts/math-generate";
import { subjectProfile } from "@/server/ai/prompts/math-rules";
import { registerGenerator } from "@/server/services/questions/generators";
import type { NewQuestion } from "@/server/services/questions/question-bank";
import { checkMathQuestion } from "./check-answer";

/**
 * Maths question generation: draft (light model) → code checks → at most ONE repair round.
 * Used by the bank's generate_question job (via registerGenerator) and by the from-reference flow.
 */

export type MathGenerateRequest = {
  subject: Subject;
  kind: MathKind;
  topicIds: string[];
  difficulty: number;
  extension: boolean;
  language: "zh" | "en";
  /** Extra instructions, e.g. the reference question and variation level. */
  extra?: string;
};

/** A model draft plus problems found while parsing its figure/graph JSON. */
export type Draft = { question: GeneratedMathQuestion; parseProblems: string[] };

export async function draftMathQuestion(req: MathGenerateRequest, onUsage?: UsageSink): Promise<Draft> {
  const q = await askStructured({
    purpose: "math_generate",
    tier: "light",
    system: generateSystem(req.subject, req.language),
    text: generateUserPrompt(req),
    schema: AiGeneratedMathQuestionSchema,
    onUsage,
  });
  const d = fromAi(q);
  return { question: tidy(d.question, req), parseProblems: d.parseProblems };
}

export async function repairMathQuestion(req: MathGenerateRequest, q: GeneratedMathQuestion, problems: string[], onUsage?: UsageSink): Promise<Draft> {
  const fixed = await askStructured({
    purpose: "math_repair",
    tier: "light",
    system: generateSystem(req.subject, req.language),
    text: repairPrompt(q, problems),
    schema: AiGeneratedMathQuestionSchema,
    onUsage,
  });
  const d = fromAi(fixed);
  return { question: tidy(d.question, req), parseProblems: d.parseProblems };
}

/** Every problem with a draft: figure/graph parsing plus the code checks. */
export function checkDraft(d: Draft, kind: MathKind) {
  return [...d.parseProblems, ...checkMathQuestion(d.question.content, kind)];
}

/** Keep only known unit ids, and fall back to the requested ones. Force fields that don't apply to maths. */
function tidy(q: GeneratedMathQuestion, req: MathGenerateRequest): GeneratedMathQuestion {
  const known = new Set(subjectProfile(req.subject).units.map((u) => u.id));
  const topicIds = [...new Set(q.topicIds.map((t) => t.trim().split(".")[0]))].filter((t) => known.has(t));
  const content = { ...q.content, materials: null, writing: null };
  if (req.kind !== "mc") Object.assign(content, { options: [], correctOption: null, distractorNotes: [] });
  return { ...q, topicIds: topicIds.length ? topicIds : req.topicIds, content };
}

/** Draft, check, and repair once. Returns the better of the two versions and its remaining problems. */
export async function generateCheckedMathQuestion(req: MathGenerateRequest, onUsage?: UsageSink) {
  const draft = await draftMathQuestion(req, onUsage);
  let question = draft.question;
  let problems = checkDraft(draft, req.kind);
  if (problems.length > 0) {
    const repaired = await repairMathQuestion(req, question, problems, onUsage);
    const after = checkDraft(repaired, req.kind);
    if (after.length <= problems.length) {
      question = repaired.question;
      problems = after;
    }
  }
  return { question, problems };
}

export function toNewQuestion(req: MathGenerateRequest, q: GeneratedMathQuestion, problems: string[]): Omit<NewQuestion, "embedding"> {
  return {
    subject: req.subject,
    kind: req.kind,
    language: req.language,
    title: q.title.trim().slice(0, 200),
    topicIds: q.topicIds,
    difficulty: req.difficulty,
    extension: req.extension,
    archetypeId: q.archetype?.trim() || null,
    content: q.content,
    checkProblems: problems,
    generatedBy: modelFor("light"),
  };
}

export function toMathKind(kind: string): MathKind {
  if (kind === "mc" || kind === "short" || kind === "long") return kind;
  throw new Error(`Maths questions can't be of kind "${kind}"`);
}

registerGenerator(["math_cp", "math_m1", "math_m2"], async ({ input, onUsage }) => {
  const req: MathGenerateRequest = {
    subject: input.subject,
    kind: toMathKind(input.kind),
    topicIds: input.topicIds ?? [],
    difficulty: input.difficulty ?? 3,
    extension: input.extension ?? false,
    language: input.language,
  };
  const { question, problems } = await generateCheckedMathQuestion(req, onUsage);
  return toNewQuestion(req, question, problems);
});
