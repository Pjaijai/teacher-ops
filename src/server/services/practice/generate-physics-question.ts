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
import {
  AiSolvedPhysicsQuestionSchema,
  physicsAnswerEditedPrompt,
  physicsSolveRepairPrompt,
  physicsSolveSystem,
  physicsSolveUserPrompt,
} from "@/server/ai/prompts/physics-solve";
import { AiPaperPlanReplySchema, PAPER_TOPIC_IDS, physicsPaperPlanSystem, physicsPaperPlanUserPrompt } from "@/server/ai/prompts/physics-paper-plan";
import type { QuestionContent } from "@/lib/schemas/question";
import { B_MAX, MC_MAX, type ChatMessage, type PaperPlanReply, type PaperSpec } from "@/lib/schemas/paper";
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
  /** The student's own steer, typed in the generate panel. */
  instructions?: string;
  /** A specific knowledge point to test, typed by the student. */
  knowledgePoint?: string;
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
    instructions: input.instructions,
    knowledgePoint: input.knowledgePoint,
  };
  const { question, problems } = await generateCheckedPhysicsQuestion(req, onUsage, step);
  return toNewPhysicsQuestion(req, question, problems);
});

// --- "Solve my question": the student's own question → answer + HKEAA-style marking scheme ---

export type SolvedPhysicsQuestion = {
  question: GeneratedPhysicsQuestion;
  kind: PhysicsKind;
  language: "zh" | "en";
  problems: string[];
  note: string | null;
};

/** Top model reads the student's question (photo and/or text), solves it; code checks the answers; one repair round. */
export async function solvePhysicsQuestion(opts: {
  images: ImageInput[];
  text?: string;
  language?: "zh" | "en";
  onUsage?: UsageSink;
  step?: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}): Promise<SolvedPhysicsQuestion> {
  const step = opts.step ?? ((_n, fn) => fn());
  const raw = await step("solve", () =>
    askStructured({
      purpose: "physics_solve",
      tier: "top",
      system: physicsSolveSystem(),
      text: physicsSolveUserPrompt({ text: opts.text, hasImages: opts.images.length > 0, language: opts.language }),
      images: opts.images,
      schema: AiSolvedPhysicsQuestionSchema,
      onUsage: opts.onUsage,
    }),
  );
  if (!raw.readable) throw new Error(raw.problemNote ?? "That doesn't look like a readable physics question. Try a clearer photo or type it in.");
  const kind = raw.kind;
  const solved = (d: PhysicsDraft): PhysicsDraft => {
    const topicIds = cleanTopicIds(d.question.topicIds);
    const content = { ...d.question.content, materials: null, writing: null, figure: null };
    if (kind !== "mc") Object.assign(content, { options: [], correctOption: null, distractorNotes: [] });
    return { ...d, question: { ...d.question, topicIds, content } };
  };

  const first = solved(fromAi(raw));
  let question = first.question;
  let problems = await step("check", async () => checkPhysicsDraft(first, kind));
  if (problems.length > 0) {
    const repaired = await step("repair", async () =>
      solved(
        fromAi(
          await askStructured({
            purpose: "physics_solve_repair",
            tier: "top",
            system: physicsSolveSystem(),
            text: physicsSolveRepairPrompt(question, problems),
            schema: AiGeneratedPhysicsQuestionSchema,
            onUsage: opts.onUsage,
          }),
        ),
      ),
    );
    const after = checkPhysicsDraft(repaired, kind);
    if (after.length <= problems.length) {
      question = repaired.question;
      problems = after;
    }
  }
  return { question, kind, language: raw.language, problems, note: raw.problemNote };
}

// --- Exam paper mode ----------------------------------------------------------------------

/** Re-answer an edited question: the top model redoes the answer side; code keeps the question side as edited. */
export async function answerPhysicsQuestion(opts: {
  question: { title: string; kind: string; topicIds: string[]; content: QuestionContent };
  onUsage?: UsageSink;
  step?: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}) {
  const step = opts.step ?? ((_n, fn) => fn());
  const kind = toPhysicsKind(opts.question.kind);
  const original = opts.question.content;
  // The question side stays exactly as the student edited it, whatever the model returns.
  const keep = (d: PhysicsDraft): PhysicsDraft => {
    const content: QuestionContent = {
      ...d.question.content,
      stem: original.stem,
      options: original.options,
      physicsFigure: original.physicsFigure ?? null,
      graph: original.graph,
      figure: null,
      materials: null,
      writing: null,
    };
    if (kind !== "mc") Object.assign(content, { options: [], correctOption: null, distractorNotes: [] });
    const topicIds = cleanTopicIds(d.question.topicIds);
    return { ...d, question: { ...d.question, topicIds: topicIds.length ? topicIds : cleanTopicIds(opts.question.topicIds), content } };
  };
  const edited: GeneratedPhysicsQuestion = { title: opts.question.title, archetype: "", topicIds: opts.question.topicIds, content: original, variableUnits: {} };

  const first = keep(
    fromAi(
      await step("solve", () =>
        askStructured({
          purpose: "physics_answer_edited",
          tier: "top",
          system: physicsSolveSystem(),
          text: physicsAnswerEditedPrompt(edited, kind),
          schema: AiGeneratedPhysicsQuestionSchema,
          onUsage: opts.onUsage,
        }),
      ),
    ),
  );
  let question = first.question;
  let problems = await step("check", async () => checkPhysicsDraft(first, kind));
  if (problems.length > 0) {
    const repaired = keep(
      fromAi(
        await step("repair", () =>
          askStructured({
            purpose: "physics_answer_repair",
            tier: "top",
            system: physicsSolveSystem(),
            text: physicsSolveRepairPrompt(question, problems),
            schema: AiGeneratedPhysicsQuestionSchema,
            onUsage: opts.onUsage,
          }),
        ),
      ),
    );
    const after = checkPhysicsDraft(repaired, kind);
    if (after.length <= problems.length) {
      question = repaired.question;
      problems = after;
    }
  }
  return { question, problems };
}

/** One turn of the paper setup chat. Code keeps the spec in range whatever the model returns. */
export async function planPhysicsPaper(opts: { messages: ChatMessage[]; spec: PaperSpec; onUsage?: UsageSink }): Promise<PaperPlanReply> {
  const r = await askStructured({
    purpose: "physics_paper_plan",
    tier: "light",
    system: physicsPaperPlanSystem(),
    text: physicsPaperPlanUserPrompt(opts.messages, opts.spec),
    schema: AiPaperPlanReplySchema,
    onUsage: opts.onUsage,
  });
  const round = (n: number, lo: number, hi: number, fallback: number) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback);
  const spec: PaperSpec = {
    preset: r.spec.preset,
    topicIds: [...new Set(r.spec.topicIds.map((t) => t.trim()))].filter((t) => PAPER_TOPIC_IDS.has(t)).slice(0, 40),
    difficulty: round(r.spec.difficulty, 1, 5, opts.spec.difficulty),
    extension: r.spec.extension,
    language: r.spec.language,
    mcCount: round(r.spec.mcCount, 1, MC_MAX, opts.spec.mcCount),
    bCount: r.spec.bCount == null ? null : round(r.spec.bCount, 1, B_MAX, opts.spec.bCount ?? 9),
    durationMin: round(r.spec.durationMin, 5, 240, opts.spec.durationMin),
    focus: r.spec.focus.map((f) => f.trim().slice(0, 200)).filter(Boolean).slice(0, 12),
    notes: r.spec.notes.trim().slice(0, 500),
  };
  return { reply: r.reply.trim(), spec, ready: r.ready };
}
