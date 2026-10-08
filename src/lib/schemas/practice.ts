import { z } from "zod";
import { DiagramSchema, GraphSchema } from "./diagram";
import { PhysicsFigureSchema } from "./physics-figure";
import { ExamLanguageSchema, SubjectSchema } from "./question";

/** Practice (maths, later M1/M2/Physics): request bodies and AI output shapes shared by API and UI. */

export const PracticeKindSchema = z.enum(["mc", "short", "long", "experiment"]);
export type PracticeKind = z.infer<typeof PracticeKindSchema>;

/** What the AI understood from a reference question. The student can edit it before generating variants. */
export const UnderstandingSchema = z.object({
  questionText: z.string().describe("The reference question, transcribed faithfully (Markdown + LaTeX in $…$)"),
  language: ExamLanguageSchema,
  kind: PracticeKindSchema,
  topic: z.string().describe('Short topic name, e.g. "Pythagoras\' theorem in a right-angled triangle"'),
  topicIds: z.array(z.string()).describe('Matching Learning Unit ids, e.g. ["CP-14"]'),
  keyIdea: z.string().describe("The mathematical idea and solution method being tested, in 1-3 sentences"),
  figure: DiagramSchema.nullable().describe("The reference figure, or null if there is none / not supported"),
  graph: GraphSchema.nullable().describe("The reference function graph, or null"),
  physicsFigure: PhysicsFigureSchema.nullable().optional().describe("Physics: the reference circuit/ray/free-body/wave figure, or null"),
  figureSupported: z.boolean().describe("false if the figure needs 3D solids, arbitrary curves or charts"),
  figureNote: z.string().nullable().describe("If unsupported, what is missing; otherwise null"),
});
export type Understanding = z.infer<typeof UnderstandingSchema>;

export const ReferenceUnderstandSchema = z
  .object({
    subject: SubjectSchema,
    uploadKeys: z.array(z.string()).max(4).optional(),
    text: z.string().max(4000).optional(),
  })
  .refine((v) => (v.uploadKeys?.length ?? 0) > 0 || (v.text?.trim().length ?? 0) > 0, "Upload a photo or type the question.");

export const ReferenceGenerateSchema = z.object({
  subject: SubjectSchema.default("math_cp"),
  understanding: UnderstandingSchema,
  variation: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  kind: PracticeKindSchema,
  count: z.number().int().min(1).max(5),
  language: ExamLanguageSchema,
});

export const CreateAttemptSchema = z.object({ questionId: z.string().min(1) });
export const McAnswerSchema = z.object({ choice: z.enum(["A", "B", "C", "D"]) });
export const UploadPagesSchema = z.object({ uploadKeys: z.array(z.string()).min(1).max(8) });
export const TranscriptSchema = z.object({ lines: z.array(z.object({ latex: z.string().max(2000) })).max(400) });
export const DisputeSchema = z.object({
  part: z.string().max(20),
  markIndex: z.number().int().min(0).nullable().optional(),
  reason: z.string().trim().min(5).max(2000),
});

/** AI transcription of handwritten maths: one entry per written line, in reading order. */
export const MathTranscriptSchema = z.object({
  lines: z
    .array(
      z.object({
        latex: z.string().describe("The line exactly as written, in LaTeX (no $). Unreadable parts as \\text{[?]}"),
      }),
    )
    .describe("Every line of working in reading order, across all pages"),
});

/** AI marking output, checked and normalised by code before it is stored. */
export const MarkingOutputSchema = z.object({
  errorTags: z
    .array(z.string())
    .describe('Short English kebab-case tags for the student\'s mistakes, e.g. "sign-error", "missing-unit", "premature-rounding"; [] if none'),
  parts: z.array(
    z.object({
      part: z.string().describe('Part label exactly as in the marking scheme ("" for single-part)'),
      marks: z.array(
        z.object({
          markIndex: z.number().describe("0-based index of the item in this part's marking scheme"),
          awarded: z.boolean(),
          reason: z.string().describe("Why the mark was awarded or lost, citing the student's working (in the feedback language)"),
          studentLine: z.number().nullable().describe("0-based transcript line where this mark is earned or lost, or null"),
          ecfFrom: z.string().nullable().describe("If awarded by follow-through, the part the error came from (e.g. \"a\"); else null"),
        }),
      ),
      firstWrongLine: z.number().nullable().describe("0-based transcript line of the first wrong step in this part, or null"),
      finalAnswerLine: z.number().nullable().describe("0-based transcript line holding the student's final answer for this part, or null"),
      finalAnswerLatex: z.string().nullable().describe("The student's final answer for this part as written (LaTeX), or null"),
      note: z.string().describe("解題 note: what the part needed, where the student went wrong, and how to fix it (2-4 sentences)"),
    }),
  ),
});
export type MarkingOutput = z.infer<typeof MarkingOutputSchema>;
