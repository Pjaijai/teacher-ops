import { z } from "zod";
import { AiGeneratedPhysicsQuestionSchema, toAi, type GeneratedPhysicsQuestion } from "./physics-generate";
import {
  PHYSICS_DESIGN_NOTES,
  PHYSICS_FIGURE_FORMATS,
  PHYSICS_FIGURE_RULES,
  PHYSICS_LATEX_RULES,
  PHYSICS_MARKING_RULES,
  PHYSICS_UNIT_RULES,
  physicsLanguageRules,
  topicList,
} from "./physics-rules";

/**
 * "Solve my question": the student's OWN physics question (photo and/or typed). The model transcribes it unchanged,
 * finds the syllabus topic, and writes the answer and an HKEAA-style marking scheme. Same content format as generated
 * questions, so the unit-aware checker and the practice pages work unchanged.
 */
export const AiSolvedPhysicsQuestionSchema = AiGeneratedPhysicsQuestionSchema.extend({
  kind: z.enum(["mc", "short", "long", "experiment"]).describe("mc if it has options A–D; long if several parts or ≥ 6 marks; experiment if it asks to design/describe an experiment or treat data; else short"),
  language: z.enum(["zh", "en"]).describe("The language the question is written in"),
  readable: z.boolean().describe("false if the photo/text is unreadable or is not a physics question"),
  problemNote: z.string().nullable().describe("If readable=false or something is missing/ambiguous, say what (question language); else null"),
});
export type AiSolvedPhysicsQuestion = z.infer<typeof AiSolvedPhysicsQuestionSchema>;

export function physicsSolveSystem() {
  return `You help a Hong Kong HKDSE Physics student with a question THEY give you (a photo and/or typed text).
Your job: (1) read the question exactly, (2) find which HKDSE Physics syllabus topic(s) it tests, (3) solve it, and
(4) write the answer and a marking scheme the way an HKDSE marker would, plus 解題 thinking and tips.

DO NOT CHANGE THE QUESTION:
- stem: transcribe the question faithfully — same wording, numbers, units, ALL parts (a), (b)(i)… (from every photo)
  and marks if shown. Fix
  only obvious OCR noise. If the student typed instructions besides the question (e.g. "please explain part b"), leave
  them out of the stem.
- MC: keep the options exactly as given (A–D, same order and values); set correctOption; for each WRONG option write a
  distractorNote naming the slip that produces it (one sentence) and a kebab-case tag. If the question has no options,
  it is not MC.
- If a figure is given and it is a circuit, ray diagram, free-body diagram or wave graph, reproduce it as figureJson;
  a data or function graph → graphJson. Any other figure (apparatus, field lines, prisms…): describe what it shows in one
  short bracketed sentence in the stem and leave figureJson "".
- If information is missing or the question is ambiguous, solve the most reasonable reading and say so in problemNote.
- Write every explanation (solution, marking scheme, taskAnalysis, tips, distractor notes) in the question's language.

Topic ids — choose from this list (one to three that the question actually tests):
${topicList()}

${PHYSICS_DESIGN_NOTES}

${PHYSICS_LATEX_RULES}

${PHYSICS_UNIT_RULES}

${PHYSICS_MARKING_RULES}

${PHYSICS_FIGURE_RULES}

${PHYSICS_FIGURE_FORMATS}

Content fields:
- variables: every given quantity and constant (g, c, h…) with its mathjs unit; answers: one per numeric answer, with a
  mathjs expression over the variables, the exact value, the unit and the display as in a marking scheme. These are
  checked by code, so they must be right.
- markingScheme: per part, the marks in HKEAA M/A notation (A marks need the unit; e.c.f. where allowed; explain parts as
  keyword points; verdict + reason; "show that" = method only). If the question shows marks, the scheme must add up to them;
  otherwise use DSE mark norms.
- solution: worked solution in marking-scheme style, one step per line, with units.
- taskAnalysis (解題): 3–6 sentences — how to read the question, the principle that unlocks each part, the trap.
- tips: 2–4 short tips and traps examiners look for.
- title: a short title for the student's list (question language).
Solve carefully and check every number and unit before answering.`;
}

export function physicsSolveUserPrompt(opts: { text?: string; hasImages: boolean; language?: "zh" | "en" }) {
  const lang = opts.language ? `\n${physicsLanguageRules(opts.language)}` : "";
  const photos = opts.hasImages
    ? `The question is in the photo(s) above. ALL the photos belong to ONE question, in page order: the stem, figures,
data tables and the parts (a), (b), (c)… may continue from one photo to the next. Read every photo, join them into one
question in order, and answer EVERY part and sub-part (e.g. (b)(i), (b)(ii)) — never stop after the first photo.
If a photo repeats something already shown (overlapping shots), use it once.`
    : "";
  return `${photos}
${opts.text?.trim() ? `The student typed:\n"""\n${opts.text.trim()}\n"""` : ""}${lang}
Transcribe it, identify the topic, solve it, and return the answer, marking scheme, 解題 and tips.`;
}

export function physicsSolveRepairPrompt(question: GeneratedPhysicsQuestion, problems: string[]) {
  return `Your answer to the student's question failed an automatic check. Fix EVERY problem listed by correcting the
SOLUTION side only — answers, variables, units, marking scheme, solution steps, correctOption, figure data. Do NOT change
the question itself: keep the stem, its numbers and the MC options exactly as they are.

Your previous answer:
${JSON.stringify(toAi(question))}

Problems found by the checker:
${problems.map((p) => `- ${p}`).join("\n")}`;
}
