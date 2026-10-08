import { askStructured, type ImageInput, type UsageSink } from "@/server/ai/open-router";
import { modelFor } from "@/server/ai/models";
import {
  AiGeneratedPhysicsQuestionSchema,
  fromAi,
  physicsGenerateSystem,
  physicsGenerateUserPrompt,
  physicsRepairPrompt,
  type GeneratedPhysicsQuestion,
  type PhysicsKind,
} from "@/server/ai/prompts/physics-generate";
import { AiPhysicsUnderstandingSchema, physicsUnderstandingFromAi, physicsUnderstandSystem, type PhysicsUnderstanding } from "@/server/ai/prompts/physics-reference";
import { understandUserPrompt } from "@/server/ai/prompts/math-reference";
import { PHYSICS_TOPIC_IDS } from "@/server/ai/prompts/physics-rules";
import { registerGenerator } from "@/server/services/questions/generators";
import type { NewQuestion } from "@/server/services/questions/question-bank";
import { checkPhysicsFigure, checkPhysicsQuestion } from "./physics-check";

/**
 * Physics question generation: draft (light model) → code checks (units, figure consistency) → at most ONE repair.
 * Used by the bank's generate_question job (via registerGenerator), /api/ai/questions/generate and the reference flow.
 */

export type PhysicsGenerateRequest = {
  kind: PhysicsKind;
  topicIds: string[];
  difficulty: number;
  extension: boolean;
  language: "zh" | "en";
  /** Extra instructions, e.g. the reference question and variation level. */
  extra?: string;
};

export type PhysicsDraft = { question: GeneratedPhysicsQuestion; parseProblems: string[] };

export function toPhysicsKind(kind: string): PhysicsKind {
  if (kind === "mc" || kind === "short" || kind === "long" || kind === "experiment") return kind;
  throw new Error(`Physics questions can't be of kind "${kind}"`);
}

const cleanTopicIds = (ids: string[]) => [...new Set(ids.map((t) => t.trim().replace(/\.\d+$/, "")))].filter((t) => PHYSICS_TOPIC_IDS.has(t));

function tidy(q: GeneratedPhysicsQuestion, req: PhysicsGenerateRequest): GeneratedPhysicsQuestion {
  const topicIds = cleanTopicIds(q.topicIds);
  const content = { ...q.content, materials: null, writing: null, figure: null };
  if (req.kind !== "mc") Object.assign(content, { options: [], correctOption: null, distractorNotes: [] });
  return { ...q, topicIds: topicIds.length ? topicIds : cleanTopicIds(req.topicIds), content };
}

export async function draftPhysicsQuestion(req: PhysicsGenerateRequest, onUsage?: UsageSink): Promise<PhysicsDraft> {
  const q = await askStructured({
    purpose: "physics_generate",
    tier: "light",
    system: physicsGenerateSystem(req.language),
    text: physicsGenerateUserPrompt(req),
    schema: AiGeneratedPhysicsQuestionSchema,
    onUsage,
  });
  const d = fromAi(q);
  return { question: tidy(d.question, req), parseProblems: d.parseProblems };
}

export async function repairPhysicsQuestion(req: PhysicsGenerateRequest, q: GeneratedPhysicsQuestion, problems: string[], onUsage?: UsageSink): Promise<PhysicsDraft> {
  const fixed = await askStructured({
    purpose: "physics_repair",
    tier: "light",
    system: physicsGenerateSystem(req.language),
    text: physicsRepairPrompt(q, problems),
    schema: AiGeneratedPhysicsQuestionSchema,
    onUsage,
  });
  const d = fromAi(fixed);
  return { question: tidy(d.question, req), parseProblems: d.parseProblems };
}

export function checkPhysicsDraft(d: PhysicsDraft, kind: PhysicsKind) {
  return [...d.parseProblems, ...checkPhysicsQuestion(d.question.content, kind, d.question.variableUnits)];
}

/** Draft, check, and repair once. Keeps the better version and its remaining problems. */
export async function generateCheckedPhysicsQuestion(
  req: PhysicsGenerateRequest,
  onUsage?: UsageSink,
  step: <T>(name: string, fn: () => Promise<T>) => Promise<T> = (_n, fn) => fn(),
) {
  const draft = await step("generate", () => draftPhysicsQuestion(req, onUsage));
  let question = draft.question;
  let problems = await step("check", async () => checkPhysicsDraft(draft, req.kind));
  if (problems.length > 0) {
    const repaired = await step("repair", () => repairPhysicsQuestion(req, question, problems, onUsage));
    const after = checkPhysicsDraft(repaired, req.kind);
    if (after.length <= problems.length) {
      question = repaired.question;
      problems = after;
    }
  }
  return { question, problems };
}

export function toNewPhysicsQuestion(req: PhysicsGenerateRequest, q: GeneratedPhysicsQuestion, problems: string[]): Omit<NewQuestion, "embedding"> {
  return {
    subject: "physics",
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

/** Top model reads a reference physics question (photo and/or text) and says what it understood. */
export async function understandPhysicsReference(opts: { images: ImageInput[]; text?: string; onUsage?: UsageSink }): Promise<PhysicsUnderstanding & { figureProblems: string[] }> {
  const raw = await askStructured({
    purpose: "reference_understand_physics",
    tier: "top",
    system: physicsUnderstandSystem(),
    text: understandUserPrompt(opts.text, opts.images.length),
    images: opts.images,
    schema: AiPhysicsUnderstandingSchema,
    onUsage: opts.onUsage,
  });
  const { understanding: u, problems } = physicsUnderstandingFromAi(raw);
  return {
    ...u,
    topicIds: cleanTopicIds(u.topicIds),
    figureProblems: [...problems, ...(u.physicsFigure ? checkPhysicsFigure(u.physicsFigure) : [])],
  };
}

registerGenerator(["physics"], async ({ input, step, onUsage }) => {
  const req: PhysicsGenerateRequest = {
    kind: toPhysicsKind(input.kind),
    topicIds: input.topicIds ?? [],
    difficulty: input.difficulty ?? 3,
    extension: input.extension ?? false,
    language: input.language,
  };
  const { question, problems } = await generateCheckedPhysicsQuestion(req, onUsage, step);
  return toNewPhysicsQuestion(req, question, problems);
});
