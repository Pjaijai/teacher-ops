import type { QuestionContent, QuestionSolution } from "@/lib/schemas/question";

export type McResult = {
  correct: boolean;
  choice: string;
  correctOption: string | null;
  /** The student mistake behind the chosen distractor (null when correct or unknown). */
  misconception: string | null;
  /** Kebab tag of that misconception, for the learner profile. */
  tag: string | null;
};

/** Instant MC marking: no AI, no credits. */
export function markMc(content: QuestionContent, choice: string): McResult {
  const correct = content.correctOption !== null && choice === content.correctOption;
  const note = correct ? undefined : content.distractorNotes.find((d) => d.label === choice);
  return {
    correct,
    choice,
    correctOption: content.correctOption,
    misconception: note?.misconception ?? null,
    tag: note?.tag ?? null,
  };
}

export type McResponse = McResult & { solution: QuestionSolution };
