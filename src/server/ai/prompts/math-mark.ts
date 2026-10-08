import type { QuestionContent } from "@/lib/schemas/question";
import type { Subject } from "@/lib/subjects";
import { physicsMarkSystem } from "./physics-mark";

/** Marker instructions for the question's subject (maths conventions by default; Physics has its own). */
export function markSystem(language: "zh" | "en", subject?: Subject) {
  if (subject === "physics") return physicsMarkSystem(language);
  return `You are an experienced HKDSE Mathematics marker. Mark a student's transcribed working against the
marking scheme, strictly following HKEAA conventions:
- Each marking-scheme item is worth exactly one mark. Decide every item: awarded true/false, with a reason.
- M marks (method): award when the correct method is shown for that step, even if an arithmetic slip happens later.
  M marks follow through: if an earlier part is wrong, a correct method applied to the wrong value still earns M.
- A marks (accuracy): need the correct value, in the requested form/accuracy (e.g. 3 sig. fig., in terms of π,
  surd form) AND the correct unit when the answer has one. A marks follow through from an earlier error ONLY when the
  scheme item has ecf = true; then set ecfFrom to the part the error came from.
- An A mark cannot be awarded if the M mark it depends on in the same part was not earned, unless the
  correct answer is obtained by another valid method.
- Correct answers by a different valid method earn full marks.
- "Show that" / "prove" parts: the result is given, so award only the method marks for the necessary steps shown;
  simply writing the given result earns nothing. Geometry proofs need each reason.
- Verdict parts ("Is the claim correct? Explain."): a wrong verdict, or a verdict without the supporting
  calculation, scores 0 for the whole part.
- Required keywords or reasons (e.g. "(rej.)", geometric reasons) must be present when the scheme asks for them.
- Premature rounding that changes the final answer loses the A mark.
- Never award a mark for something the student didn't write. Never invent working. Unreadable \\text{[?]} parts
  are judged on what is legible.
Transcript lines are numbered from 0. For every part also give the first wrong line (null if none), the line and
LaTeX of the student's final answer for that part (null if none), and a short 解題 note: what the part needed,
where the student went wrong and how to fix it.
Write reasons and notes in ${language === "zh" ? "Traditional Chinese (Hong Kong), with maths in $…$" : "English, with maths in $…$"}.`;
}

export function markUserPrompt(content: QuestionContent, lines: { latex: string }[]) {
  const scheme = content.markingScheme
    .map(
      (p) =>
        `Part ${p.part ? `(${p.part})` : "(whole question)"} — ${p.marks} marks\n${p.items
          .map((it, i) => `  [${i}] 1${it.type}${it.ecf ? " (ecf allowed)" : ""}: ${it.text}`)
          .join("\n")}`,
    )
    .join("\n");
  const answers = content.answers.map((a) => `  ${a.part ? `(${a.part})` : ""} ${a.display}`).join("\n");
  const figure = content.physicsFigure ? `\nFIGURE (structured data, as drawn for the student)\n${JSON.stringify(content.physicsFigure)}\n` : "";
  return `QUESTION
${content.stem}
${figure}
MARKING SCHEME
${scheme}

ANSWERS
${answers || "  (no single numeric answers — proofs, verdicts or expressions)"}

MODEL SOLUTION
${content.solution.join("\n")}

STUDENT'S WORKING (transcript, line numbers from 0)
${lines.map((l, i) => `${i}: ${l.latex}`).join("\n") || "(empty)"}

Mark every item of every part.`;
}
