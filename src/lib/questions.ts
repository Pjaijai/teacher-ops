import { z } from "zod";
import { DIAGRAM_RULES, DiagramSchema } from "./diagram";

export const LanguageSchema = z.enum(["en", "zh"]);
export const AnswerTypeSchema = z.enum(["mc", "long"]);
export type Language = z.infer<typeof LanguageSchema>;
export type AnswerType = z.infer<typeof AnswerTypeSchema>;

/** What the AI understood from the reference question. The teacher can edit this before generating. */
export const UnderstandingSchema = z.object({
  questionText: z.string().describe("The reference question text, transcribed faithfully (plain Unicode maths, no LaTeX)"),
  language: LanguageSchema,
  answerType: AnswerTypeSchema,
  topic: z.string().describe('Short topic name, e.g. "Pythagoras\' theorem in a right-angled triangle"'),
  keyIdea: z.string().describe("The mathematical idea and solution method being tested, in 1-3 sentences"),
  diagram: DiagramSchema.nullable().describe("The reference figure, or null if there is none"),
  diagramSupported: z.boolean().describe("false if the figure needs circles, 3D solids or curves"),
  diagramNote: z.string().nullable().describe("If unsupported, explain what is missing; otherwise null"),
});
export type Understanding = z.infer<typeof UnderstandingSchema>;

export const GeneratedQuestionSchema = z.object({
  stem: z.string().describe("Full question text as printed on the worksheet, including parts (a), (b) if any"),
  marks: z.number(),
  diagram: DiagramSchema.nullable(),
  options: z
    .array(z.object({ label: z.enum(["A", "B", "C", "D"]), text: z.string() }))
    .describe("Exactly 4 options for MC; empty array for long questions"),
  correctOption: z.enum(["A", "B", "C", "D"]).nullable(),
  distractorNotes: z
    .array(z.object({ label: z.enum(["A", "B", "C", "D"]), mistake: z.string() }))
    .describe("For each wrong MC option, the student mistake that produces it; empty for long questions"),
  variables: z
    .array(z.object({ name: z.string(), value: z.number() }))
    .describe("Every given numeric quantity, with an identifier name, e.g. AB=5"),
  answers: z
    .array(
      z.object({
        part: z.string().describe('"" for single-part questions, else "a", "b", ...'),
        expression: z.string().describe("mathjs expression computing the answer from the variables"),
        value: z.number().describe("The numeric answer you claim (before rounding for display)"),
        display: z.string().describe('Answer as written in the key, e.g. "13 cm" or "11.2 cm (cor. to 3 sig. fig.)"'),
      }),
    )
    .describe("One entry per numeric answer"),
  solution: z.array(z.string()).describe("Worked solution, one step per line, as in a DSE marking scheme"),
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export const GeneratedSetSchema = z.object({ questions: z.array(GeneratedQuestionSchema) });

export const LEVELS = {
  1: "Number swap: keep the same wording, structure and figure shape; change only the numbers. Choose numbers that give clean answers (e.g. Pythagorean triples) or answers to 3 significant figures as DSE does.",
  2: "Context swap: keep the same mathematics and solution method but use a new real-life or geometric setting (ladder, ramp, kite, field…), with a matching new figure.",
  3: "Structure variant: same concept, but change what is unknown (e.g. find a leg instead of the hypotenuse), or add one extra step (e.g. a second triangle sharing a side).",
} as const;
export type Level = keyof typeof LEVELS;

const MATHJS_RULES = `Answer-check rules (your answers are verified by a program, so be exact):
- variables: name every given number with a simple identifier (AB, BC, h, theta, …) and its value.
- answers[].expression: a mathjs expression using ONLY those variable names, numbers, + - * / ^, sqrt(), and the degree-based trig functions sind(), cosd(), tand(), asind(), acosd(), atand(). Example: sqrt(AB^2 + BC^2), or BC / tand(theta).
- answers[].value: the exact (unrounded) numeric result of that expression.
- Angles are in degrees.`;

const STYLE_RULES = `Style:
- Hong Kong HKDSE Mathematics Compulsory Part, F4-F6.
- Plain Unicode maths only (√, ², ³, °, θ, π, ×, ÷, ∠, △). Never use LaTeX or Markdown.
- If language is "zh", write in Traditional Chinese (Hong Kong) with DSE terminology: 斜邊 (hypotenuse), 畢氏定理 (Pythagoras' theorem), 直角三角形, 答案須準確至三位有效數字 (correct to 3 significant figures), 求 (find), 圖中 (in the figure).
- If language is "en", use DSE English wording ("Find …", "correct your answer to 3 significant figures", "In the figure, …").
- Long questions: show marks like a DSE paper. MC questions: 1 mark, exactly four options A-D, one correct.
- MC distractors must come from realistic student mistakes (e.g. adding instead of squaring, forgetting the square root, using the wrong side as hypotenuse, using sin instead of cos), never random numbers. Shuffle which letter is correct.`;

export const UNDERSTAND_SYSTEM = `You help a Hong Kong secondary-school maths teacher. Read the reference question (from an image and/or typed text) and describe it precisely so that new variants can be generated.
If the teacher typed a description of a figure instead of providing an image, build the diagram from that description.
${DIAGRAM_RULES}
If the figure is not supported, still fill in everything else, set diagramSupported=false, diagram=null and explain in diagramNote.`;

export const GENERATE_SYSTEM = `You write new maths questions for a Hong Kong teacher, based on a reference question.
${STYLE_RULES}

${MATHJS_RULES}

${DIAGRAM_RULES}
If a question needs a figure, include it in diagram (it must match the numbers in the stem exactly; given lengths appear as segment labels). If no figure is needed, diagram=null.`;

export function generatePrompt(opts: {
  understanding: Understanding;
  level: Level;
  answerType: AnswerType;
  language: Language;
  count: number;
}) {
  const u = opts.understanding;
  return `Reference question:
${u.questionText}

Topic: ${u.topic}
Key idea: ${u.keyIdea}
Reference figure (structured): ${u.diagram ? JSON.stringify(u.diagram) : "none"}

Write ${opts.count} new question(s).
Variation level ${opts.level} — ${LEVELS[opts.level]}
Answer type: ${opts.answerType === "mc" ? "multiple choice (4 options)" : "long question (written answer with working)"}
Language: ${opts.language === "zh" ? "Traditional Chinese (zh)" : "English (en)"}
Make the questions differ from each other.`;
}

export function fixPrompt(items: { question: GeneratedQuestion; problems: string[] }[]) {
  return `These generated questions failed an automatic check. Return corrected versions, in the same order, fixing every problem listed. Keep the questions otherwise the same where possible.

${items
  .map(
    (it, i) => `Question ${i + 1}:
${JSON.stringify(it.question)}
Problems:
${it.problems.map((p) => `- ${p}`).join("\n")}`,
  )
  .join("\n\n")}`;
}
