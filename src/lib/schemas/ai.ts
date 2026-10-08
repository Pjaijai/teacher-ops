import { z } from "zod";
import { ExamLanguageSchema, NextQuestionSchema, QuestionContentSchema, QuestionKindSchema, SubjectSchema } from "./question";
import { HelperKindSchema } from "./writing";

/** Request bodies for the stateless AI API (/api/ai/*) used in local mode. Everything the AI needs is in the request. */

export const ImageSchema = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().max(8_000_000), // base64, no data: prefix
});
export type AiImage = z.infer<typeof ImageSchema>;

/** A question as the browser stores it (the same fields the server's question row has). */
export const QuestionLiteSchema = z.object({
  subject: SubjectSchema,
  kind: QuestionKindSchema,
  title: z.string(),
  part: z.string().nullable(),
  language: ExamLanguageSchema,
  topicIds: z.array(z.string()),
  content: QuestionContentSchema,
});
export type QuestionLite = z.infer<typeof QuestionLiteSchema>;

export const AiGenerateSchema = NextQuestionSchema.extend({ language: ExamLanguageSchema });

export const AiWritingHelperSchema = z.object({ question: QuestionLiteSchema, kind: HelperKindSchema });
export const AiWritingTranscribeSchema = z.object({
  subject: z.enum(["chi_writing", "eng_writing"]),
  images: z.array(ImageSchema).min(1).max(8),
});
export const AiWritingFeedbackSchema = z.object({
  question: QuestionLiteSchema,
  /** The essay as reviewed by the student (may contain [X?]/[X!]/{+…+} markers). */
  text: z.string().min(1).max(20000),
  wantsEstimate: z.boolean(),
});
export const AiWritingSampleSchema = z.object({
  question: QuestionLiteSchema,
  text: z.string().min(1).max(20000),
  feedbackSummary: z.string().max(20000),
  script: z.enum(["trad", "simp"]).nullable(),
  targetLevel: z.number().int().min(2).max(7),
});

export const AiPracticeUnderstandSchema = z
  .object({ subject: SubjectSchema, images: z.array(ImageSchema).max(4).default([]), text: z.string().max(4000).optional() })
  .refine((v) => v.images.length > 0 || (v.text?.trim().length ?? 0) > 0, "Upload a photo or type the question.");
export const AiPracticeTranscribeSchema = z.object({ images: z.array(ImageSchema).min(1).max(8), questionStem: z.string().max(20000) });
export const AiPracticeMarkSchema = z.object({
  question: QuestionLiteSchema,
  lines: z.array(z.object({ latex: z.string().max(2000) })).min(1).max(400),
});

/** "Solve my question": the student's own question (photo and/or text) → answer + marking scheme. Physics for now. */
export const SOLVE_SUBJECTS = ["physics"] as const;
export const AiPracticeSolveSchema = z
  .object({
    subject: z.enum(SOLVE_SUBJECTS),
    /** Pages of ONE question, in order (its parts may continue across photos). */
    images: z.array(ImageSchema).max(8).default([]),
    text: z.string().max(6000).optional(),
    /** Language for the explanations; default = the question's own language */
    language: ExamLanguageSchema.optional(),
  })
  .refine((v) => v.images.length > 0 || (v.text?.trim().length ?? 0) > 0, "Upload a photo or type the question.");
