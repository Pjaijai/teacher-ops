import { create, all } from "mathjs";
import { checkDiagram } from "./diagram";
import type { AnswerType, GeneratedQuestion } from "./questions";

const math = create(all);
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const degreeTrig = {
  sind: (d: number) => Math.sin(toRad(d)),
  cosd: (d: number) => Math.cos(toRad(d)),
  tand: (d: number) => Math.tan(toRad(d)),
  asind: (x: number) => toDeg(Math.asin(x)),
  acosd: (x: number) => toDeg(Math.acos(x)),
  atand: (x: number) => toDeg(Math.atan(x)),
};

function close(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 0.005);
}

/** Numbers appearing in a display string, e.g. "11.2 cm" -> [11.2]. √ forms are skipped. */
function numbersIn(text: string): number[] {
  if (/√|sqrt/.test(text)) return [];
  return [...text.replace(/,(?=\d{3})/g, "").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

/** Everything wrong with a generated question, found by code rather than by the AI. Empty = passed. */
export function checkQuestion(q: GeneratedQuestion, answerType: AnswerType): string[] {
  const problems: string[] = [];
  const scope: Record<string, unknown> = { ...degreeTrig };
  for (const v of q.variables) scope[v.name] = v.value;

  if (q.answers.length === 0) problems.push("No answers were given");

  for (const a of q.answers) {
    const label = a.part ? `Answer (${a.part})` : "Answer";
    let computed: number;
    try {
      const result = math.evaluate(a.expression, { ...scope });
      computed = typeof result === "number" ? result : Number(result);
    } catch (e) {
      problems.push(`${label}: expression "${a.expression}" could not be evaluated (${(e as Error).message})`);
      continue;
    }
    if (!Number.isFinite(computed)) {
      problems.push(`${label}: expression "${a.expression}" does not give a real number`);
      continue;
    }
    if (!close(computed, a.value)) {
      problems.push(`${label}: claimed ${a.value} but ${a.expression} = ${computed}`);
    }
    const shown = numbersIn(a.display);
    if (shown.length > 0 && !shown.some((n) => Math.abs(n - computed) <= Math.max(0.006, Math.abs(computed) * 0.006))) {
      problems.push(`${label}: displayed answer "${a.display}" does not match the computed value ${computed}`);
    }
  }

  if (answerType === "mc") {
    if (q.options.length !== 4) problems.push(`MC question has ${q.options.length} options instead of 4`);
    const correct = q.options.find((o) => o.label === q.correctOption);
    if (!correct) {
      problems.push("MC question has no valid correct option");
    } else if (q.answers.length > 0) {
      const target = q.answers[q.answers.length - 1].value;
      const inCorrect = numbersIn(correct.text);
      if (inCorrect.length > 0 && !inCorrect.some((n) => Math.abs(n - target) <= Math.max(0.006, Math.abs(target) * 0.006))) {
        problems.push(`Correct option ${correct.label} ("${correct.text}") does not match the answer ${target}`);
      }
      for (const o of q.options) {
        if (o.label === correct.label) continue;
        const nums = numbersIn(o.text);
        if (nums.length > 0 && nums.length === inCorrect.length && nums.every((n, i) => close(n, inCorrect[i]))) {
          problems.push(`Option ${o.label} has the same value as the correct option`);
        }
      }
    }
    const texts = q.options.map((o) => o.text.trim());
    if (new Set(texts).size !== texts.length) problems.push("Two MC options are identical");
  }

  if (q.diagram) problems.push(...checkDiagram(q.diagram));
  return problems;
}
