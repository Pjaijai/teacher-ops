import { and, eq, sql } from "drizzle-orm";
import type { QuestionContent, QuestionPublic, QuestionSolution } from "@/lib/schemas/question";
import type { Subject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";
import { questionViews, questions } from "@/server/db/schema";
import { notFound } from "@/server/errors";

export type NewQuestion = {
  subject: Subject;
  kind: (typeof questions.$inferInsert)["kind"];
  language: "zh" | "en";
  title: string;
  topicIds: string[];
  part?: string | null;
  difficulty?: number;
  extension?: boolean;
  archetypeId?: string | null;
  content: QuestionContent;
  /** Problems found by code checks; a question with problems never becomes public. */
  checkProblems: string[];
  generatedBy?: string | null;
  /** Set for private questions (reference image, own prompt). */
  ownerId?: string | null;
  origin?: "bank" | "reference_image" | "own_prompt";
  embedding?: number[] | null;
};

/** Insert a question. Public bank questions become `active` only when every check passed. */
export async function saveQuestion(db: Db, q: NewQuestion): Promise<string> {
  const isPrivate = Boolean(q.ownerId);
  const status = isPrivate || q.checkProblems.length === 0 ? "active" : "checking";
  const searchText = [q.title, q.content.stem, q.content.materials ?? ""].join("\n").replace(/[$\\{}]/g, " ").slice(0, 4000);
  const [row] = await db
    .insert(questions)
    .values({
      subject: q.subject,
      kind: q.kind,
      origin: q.origin ?? (isPrivate ? "reference_image" : "bank"),
      status,
      ownerId: q.ownerId ?? null,
      language: q.language,
      topicIds: q.topicIds,
      archetypeId: q.archetypeId ?? null,
      part: q.part ?? null,
      difficulty: q.difficulty ?? 3,
      extension: q.extension ?? false,
      title: q.title,
      content: q.content,
      checkProblems: q.checkProblems,
      searchText,
      embedding: q.embedding ?? null,
      generatedBy: q.generatedBy ?? null,
    })
    .returning({ id: questions.id });
  return row.id;
}

/** Load a question the user may see: active public questions, or their own private ones. */
export async function loadQuestion(db: Db, userId: string, id: string) {
  const [q] = await db.select().from(questions).where(eq(questions.id, id));
  if (!q) throw notFound("Question not found");
  if (q.ownerId && q.ownerId !== userId) throw notFound("Question not found");
  if (!q.ownerId && q.status !== "active" && q.status !== "reported") throw notFound("Question not found");
  return q;
}

export function toPublic(q: typeof questions.$inferSelect): QuestionPublic {
  const c = q.content;
  return {
    id: q.id,
    subject: q.subject,
    kind: q.kind,
    title: q.title,
    language: q.language,
    topicIds: q.topicIds,
    part: q.part,
    difficulty: q.difficulty,
    extension: q.extension,
    isPrivate: Boolean(q.ownerId),
    rating: { up: q.ratingUp, down: q.ratingDown },
    content: { stem: c.stem, materials: c.materials, figure: c.figure, graph: c.graph, options: c.options, writing: c.writing, physicsFigure: c.physicsFigure ?? null },
  };
}

export function toSolution(q: typeof questions.$inferSelect): QuestionSolution {
  const c = q.content;
  return {
    answers: c.answers,
    markingScheme: c.markingScheme,
    solution: c.solution,
    taskAnalysis: c.taskAnalysis,
    tips: c.tips,
    correctOption: c.correctOption,
    distractorNotes: c.distractorNotes,
  };
}

/** Record that a student saw (and optionally attempted) a question. */
export async function markViewed(db: Db, userId: string, questionId: string, opts: { attempted?: boolean; revealedEarly?: boolean } = {}) {
  await db
    .insert(questionViews)
    .values({ userId, questionId, attempted: opts.attempted ?? false, solutionRevealedEarly: opts.revealedEarly ?? false })
    .onConflictDoUpdate({
      target: [questionViews.userId, questionViews.questionId],
      set: {
        attempted: opts.attempted ? true : sql`${questionViews.attempted}`,
        solutionRevealedEarly: opts.revealedEarly ? true : sql`${questionViews.solutionRevealedEarly}`,
      },
    });
}

export async function hasAttempted(db: Db, userId: string, questionId: string) {
  const [v] = await db
    .select({ attempted: questionViews.attempted })
    .from(questionViews)
    .where(and(eq(questionViews.userId, userId), eq(questionViews.questionId, questionId)));
  return Boolean(v?.attempted);
}
