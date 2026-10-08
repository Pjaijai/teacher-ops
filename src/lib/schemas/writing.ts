import { z } from "zod";

/** One change the student made to the AI's reading of their handwriting. Positions are in the edited text. */
export type TrackedEdit = { at: number; before: string; after: string };

export const HELPER_KINDS = ["task_analysis", "outline", "vocabulary", "sentence_patterns", "idioms"] as const;
export const HelperKindSchema = z.enum(HELPER_KINDS);
export type HelperKind = z.infer<typeof HelperKindSchema>;

export const CreateSubmissionSchema = z.object({
  questionId: z.string(),
  inputMode: z.enum(["typed", "photo"]),
  text: z.string().max(20000).optional(),
  uploadKeys: z.array(z.string()).max(8).optional(),
  parentSubmissionId: z.string().optional(),
});

export const SubmitSchema = z.object({ wantsEstimate: z.boolean() });
export const SampleSchema = z.object({ targetLevel: z.number().int().min(2).max(7).optional() });
export const EditTextSchema = z.object({ editedText: z.string().max(20000) });

/**
 * Transcription markers kept in the text the student reviews:
 *   [X?]  the reader is unsure the character/word is X
 *   [X!]  malformed character (錯字, not a real character) — Chinese only
 *   {+…+} words the student inserted between lines (∨ / ⋀ marks)
 */
export const MARKER = /\[([^\[\]?!]+)([?!])\]/g;
export const INSERTION = /\{\+([^{}]*)\+\}/g;
