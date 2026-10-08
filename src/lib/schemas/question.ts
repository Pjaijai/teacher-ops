import { z } from "zod";
import { SUBJECTS } from "@/lib/subjects";
import { DiagramSchema, GraphSchema } from "./diagram";
import { PhysicsFigureSchema } from "./physics-figure";

export const SubjectSchema = z.enum(SUBJECTS);
export const QuestionKindSchema = z.enum(["writing_task", "mc", "short", "long", "experiment"]);
export const ExamLanguageSchema = z.enum(["zh", "en"]);
export type QuestionKind = z.infer<typeof QuestionKindSchema>;

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export const MarkItemSchema = z.object({
  type: z.enum(["M", "A"]).describe("M = method mark, A = answer mark (needs the correct unit)"),
  text: z.string().describe("What earns this mark, in LaTeX-capable Markdown"),
  ecf: z.boolean().describe("true if the A mark may follow through from an earlier wrong answer"),
});

export const MarkingPartSchema = z.object({
  part: z.string().describe('"" for single-part questions, else "a", "b(i)", …'),
  marks: z.number(),
  items: z.array(MarkItemSchema),
});

/**
 * M1/M2 answers that aren't single numbers (a derivative, an integral, an identity, a sum…),
 * verified by code at random points instead of by mathjs evaluation of one value.
 */
export const SymbolicCheckSchema = z.object({
  part: z.string(),
  kind: z.enum(["derivative", "integral", "definite_integral", "identity", "limit", "sum"]),
  /** mathjs expression in `variable`: the function being differentiated/integrated, or the left side of an identity */
  expr: z.string(),
  /** mathjs expression for the claimed result (derivative, antiderivative, right side, closed form, limit value…) */
  claimed: z.string(),
  variable: z.string(),
  /** definite integrals and sums: bounds; limits: the point approached (in `lower`) */
  lower: z.number().nullable(),
  upper: z.number().nullable(),
  /** sample interval for random-point checks, e.g. [0.5, 3] to stay inside the domain */
  domain: z.tuple([z.number(), z.number()]),
});
export type SymbolicCheck = z.infer<typeof SymbolicCheckSchema>;

/**
 * Everything about one question. Stored as `questions.content` and produced by the generator.
 * Text fields are Markdown with LaTeX in $…$ (rendered with KaTeX).
 */
export const QuestionContentSchema = z.object({
  stem: z.string().describe("Full question as printed, including parts (a), (b); Markdown + LaTeX in $…$"),
  materials: z.string().nullable().describe("Writing tasks: reading materials / input (Markdown); else null"),
  figure: DiagramSchema.nullable(),
  graph: GraphSchema.nullable(),
  options: z.array(z.object({ label: z.enum(OPTION_LABELS), text: z.string() })).describe("Exactly 4 for MC, else empty"),
  correctOption: z.enum(OPTION_LABELS).nullable(),
  distractorNotes: z
    .array(z.object({ label: z.enum(OPTION_LABELS), misconception: z.string(), tag: z.string() }))
    .describe("For each wrong MC option: the student mistake that produces it, and a short kebab tag"),
  variables: z.array(z.object({ name: z.string(), value: z.number() })).describe("Every given number, named"),
  answers: z
    .array(
      z.object({
        part: z.string(),
        expression: z.string().describe("mathjs expression over the variables that computes the answer"),
        value: z.number(),
        unit: z.string().nullable(),
        display: z.string().describe('Answer as written in the key, e.g. "$13$ cm" or "$11.2$ (cor. to 3 sig. fig.)"'),
      }),
    )
    .describe("One entry per numeric answer; empty for proofs or writing tasks"),
  markingScheme: z.array(MarkingPartSchema).describe("HKEAA-style M/A marking scheme per part; empty for writing tasks"),
  solution: z.array(z.string()).describe("Worked solution, one step per line"),
  taskAnalysis: z.string().describe("解題: how to read the question and which idea unlocks it (Markdown)"),
  tips: z.array(z.string()).describe("Tips and common traps"),
  symbolicChecks: z.array(SymbolicCheckSchema).optional().describe("M1/M2: code-verified symbolic answers"),
  physicsFigure: PhysicsFigureSchema.nullable().optional().describe("Physics: circuit, ray, free-body or wave figure"),
  writing: z
    .object({
      part: z.string().describe("乙部 | 甲部 | A | B"),
      genre: z.string().nullable(),
      textType: z.string().nullable(),
      wordLimit: z.number().nullable(),
    })
    .nullable()
    .describe("Writing tasks only; else null"),
});
export type QuestionContent = z.infer<typeof QuestionContentSchema>;

/** What the student sees before attempting: no answers, scheme, solution or tips. */
export type QuestionPublic = {
  id: string;
  subject: (typeof SUBJECTS)[number];
  kind: QuestionKind;
  title: string;
  language: "zh" | "en";
  topicIds: string[];
  part: string | null;
  difficulty: number;
  extension: boolean;
  isPrivate: boolean;
  rating: { up: number; down: number };
  content: Pick<QuestionContent, "stem" | "materials" | "figure" | "graph" | "options" | "writing" | "physicsFigure">;
};

export type QuestionSolution = Pick<
  QuestionContent,
  "answers" | "markingScheme" | "solution" | "taskAnalysis" | "tips" | "correctOption" | "distractorNotes"
>;

export const SearchQuerySchema = z.object({
  subject: SubjectSchema.optional(),
  topic: z.array(z.string()).optional(),
  kind: QuestionKindSchema.optional(),
  part: z.string().optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  extension: z.enum(["true", "false"]).optional(),
  language: ExamLanguageSchema.optional(),
  q: z.string().max(200).optional(),
  unattempted: z.enum(["true", "false"]).optional(),
  sort: z.enum(["relevance", "rating", "new"]).optional(),
  cursor: z.string().optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const NextQuestionSchema = z.object({
  subject: SubjectSchema,
  topicIds: z.array(z.string()).default([]),
  kind: QuestionKindSchema,
  part: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).default(3),
  extension: z.boolean().default(false),
  language: ExamLanguageSchema.optional(),
  /** Writing tasks: genre or text type topic id, e.g. CHI-B-argumentative */
  forceNew: z.boolean().default(false),
});
export type NextQuestionInput = z.infer<typeof NextQuestionSchema>;
