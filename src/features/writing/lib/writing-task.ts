import type { QuestionContent } from "@/lib/schemas/question";

/**
 * Pure writing-task rules, shared by local mode in the browser. Mirrors the server's
 * writing-common.ts / writing-task-content.ts (those import database code, so they stay server-only).
 */
export type WritingSubject = "chi_writing" | "eng_writing";

/** Canonical paper part: "A" (Chinese 甲部 / English Part A) or "B" (乙部 / Part B). */
export function canonicalPart(q: { part: string | null; content: Pick<QuestionContent, "writing"> }): "A" | "B" {
  const p = (q.content.writing?.part ?? q.part ?? "").trim();
  return p === "甲部" || p.toUpperCase() === "A" ? "A" : "B";
}

export const displayPart = (subject: WritingSubject, part: "A" | "B") => (subject === "chi_writing" ? (part === "A" ? "甲部" : "乙部") : part);

/** Chinese 甲部 gets feedback only (no DSE estimate). */
export const estimateAllowed = (subject: WritingSubject, part: "A" | "B") => !(subject === "chi_writing" && part === "A");

/** Minimum length before feedback: Chinese characters / English words. */
export const minLength = (subject: WritingSubject) => (subject === "chi_writing" ? 20 : 10);

/** Default level-sample target: one above the estimate, or Level 4 without one. */
export const defaultTargetLevel = (estimateLevel: number | null) => (estimateLevel ? Math.min(7, estimateLevel + 1) : 4);

/** Chinese 甲部 550字 (punctuation included); English Part A ~200, Part B ~400 words. */
export const DEFAULT_WORD_LIMIT: Record<WritingSubject, Record<"A" | "B", number | null>> = {
  chi_writing: { A: 550, B: null },
  eng_writing: { A: 200, B: 400 },
};

export const partTopicId = (subject: WritingSubject, part: "A" | "B") =>
  subject === "chi_writing" ? (part === "A" ? "CHI-A" : "CHI-B") : part === "A" ? "ENG-A" : "ENG-B";

/** QuestionContent for a writing task: no answers, scheme or figure. */
export function writingContent(c: {
  stem: string;
  materials: string | null;
  part: string;
  genre: string | null;
  textType: string | null;
  wordLimit: number | null;
}): QuestionContent {
  return {
    stem: c.stem,
    materials: c.materials,
    figure: null,
    graph: null,
    options: [],
    correctOption: null,
    distractorNotes: [],
    variables: [],
    answers: [],
    markingScheme: [],
    solution: [],
    taskAnalysis: "",
    tips: [],
    writing: { part: c.part, genre: c.genre, textType: c.textType, wordLimit: c.wordLimit },
  };
}
