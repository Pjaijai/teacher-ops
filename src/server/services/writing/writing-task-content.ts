import type { QuestionContent } from "@/lib/schemas/question";
import type { WritingSubject } from "./writing-common";

/** Paper part from a request: `part` (甲部/乙部/A/B) or topic ids (CHI-A…, CHI-B…, ENG-A, ENG-B). */
export function partFromRequest(subject: WritingSubject, topicIds: string[], part?: string | null): "A" | "B" {
  const p = (part ?? "").trim();
  if (p === "甲部" || p.toUpperCase() === "A") return "A";
  if (p === "乙部" || p.toUpperCase() === "B") return "B";
  const prefix = subject === "chi_writing" ? "CHI-A" : "ENG-A";
  return topicIds.some((t) => t === prefix || t.startsWith(`${prefix}-`)) ? "A" : "B";
}

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
  taskAnalysis?: string;
  tips?: string[];
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
    taskAnalysis: c.taskAnalysis ?? "",
    tips: c.tips ?? [],
    writing: { part: c.part, genre: c.genre, textType: c.textType, wordLimit: c.wordLimit },
  };
}
