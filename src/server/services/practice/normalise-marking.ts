import type { MarkingOutput } from "@/lib/schemas/practice";
import type { QuestionContent } from "@/lib/schemas/question";
import type { Subject } from "@/lib/subjects";
import { compareStudentAnswer } from "./check-answer";
import { alternativeValues, compareStudentQuantity } from "./physics-check";

export type MarkRow = {
  part: string;
  markIndex: number;
  type: "M" | "A";
  awarded: boolean;
  reason: string;
  studentLine: number | null;
  ecfFrom: string | null;
};
export type PartRow = { part: string; firstWrongLine: number | null; note: string };

/** "Give your answer in MeV" / "以 MeV 表示": the unit may then be omitted. */
function unitFixedByQuestion(stem: string, unit: string | null) {
  if (!unit) return true;
  const u = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:\\bin|以)\\s*\\$?\\s*(?:\\\\text\\{\\s*)?${u}\\b`).test(stem);
}

const normPart = (p: string) => p.replace(/[()\s]/g, "").toLowerCase();

/**
 * Turn the AI marker's output into exactly one row per marking-scheme item, then apply code checks:
 * when the student's final numeric answer for a part clearly differs from the key, an awarded final A mark
 * (with no e.c.f. allowance) is withdrawn.
 * Physics: the comparison converts units (250 cm = 2.5 m), accepts g = 9.81 / 10 alternatives, and a final answer with
 * a missing or wrong unit loses its A mark — once per question, as HKEAA penalises a repeated unit error only once.
 */
export function normaliseMarking(
  content: QuestionContent,
  output: MarkingOutput,
  lineCount: number,
  language: "zh" | "en" = "en",
  subject?: Subject,
) {
  const physics = subject === "physics";
  let unitPenaltyGiven = false;
  const line = (n: number | null | undefined) => (typeof n === "number" && Number.isInteger(n) && n >= 0 && n < lineCount ? n : null);
  const marks: MarkRow[] = [];
  const parts: PartRow[] = [];
  const overrides: string[] = [];

  for (const scheme of content.markingScheme) {
    const ai = output.parts.find((p) => p.part === scheme.part) ?? output.parts.find((p) => normPart(p.part) === normPart(scheme.part));
    const rows: MarkRow[] = scheme.items.map((item, i) => {
      const m = ai?.marks.find((x) => x.markIndex === i);
      return {
        part: scheme.part,
        markIndex: i,
        type: item.type,
        awarded: Boolean(m?.awarded),
        reason: m?.reason?.trim() || (language === "zh" ? "評卷員未有評核此分。" : "Not assessed by the marker."),
        studentLine: line(m?.studentLine),
        ecfFrom: m?.awarded && item.ecf ? (m.ecfFrom ?? null) : null,
      };
    });

    // Code check: re-evaluate the student's final numeric answer.
    const keys = content.answers.filter((a) => a.part === scheme.part);
    const finalLatex = ai?.finalAnswerLatex?.trim();
    if (keys.length > 0 && finalLatex) {
      const lastA = [...rows].reverse().find((r) => r.type === "A");
      const item = lastA ? scheme.items[lastA.markIndex] : null;
      const canWithdraw = Boolean(lastA && item && lastA.awarded && !item.ecf && !lastA.ecfFrom);
      const expected = keys.map((k) => k.display).join(language === "zh" ? " 或 " : " or ");
      const withdraw = (reason: string) => {
        lastA!.awarded = false;
        lastA!.reason = reason;
        lastA!.studentLine = line(ai?.finalAnswerLine) ?? lastA!.studentLine;
        overrides.push(`${scheme.part || "whole"}#${lastA!.markIndex}`);
      };
      if (physics) {
        const results = keys.map((k) => compareStudentQuantity(finalLatex, k, alternativeValues(k.expression, content.variables, k.value)));
        const hit = results.find((r) => r.value === "match");
        if (!hit && results.length > 0 && results.every((r) => r.value === "mismatch")) {
          if (canWithdraw)
            withdraw(
              language === "zh"
                ? `程式核對：你的最終答案 $${finalLatex}$ 與正確答案 ${expected} 不符（已容許單位換算及 $g = 10$），所以不給此 A 分。`
                : `Code check: your final answer $${finalLatex}$ does not equal the expected ${expected} (unit conversions and $g = 10$ allowed), so this A mark is not awarded.`,
            );
        } else if (hit && (hit.unit === "wrong" || (hit.unit === "missing" && !unitFixedByQuestion(content.stem, keys[0].unit)))) {
          if (canWithdraw && !unitPenaltyGiven) {
            unitPenaltyGiven = true;
            withdraw(
              language === "zh"
                ? `程式核對：數值正確，但${hit.unit === "missing" ? "欠缺單位" : "單位錯誤"}（應為 ${expected}）。A 分須有正確單位。`
                : `Code check: the number is right but the unit is ${hit.unit === "missing" ? "missing" : "wrong"} (expected ${expected}). A marks need the correct unit.`,
            );
          } else unitPenaltyGiven = true;
        }
      } else {
        const results = keys.map((k) => compareStudentAnswer(finalLatex, k));
        const verdict = results.includes("match") ? "match" : results.every((r) => r === "mismatch") ? "mismatch" : "unknown";
        if (verdict === "mismatch" && canWithdraw) {
          withdraw(
            language === "zh"
              ? `程式核對：你的最終答案 $${finalLatex}$ 與正確答案 ${expected} 不符，所以不給此 A 分。`
              : `Code check: your final answer $${finalLatex}$ does not equal the expected ${expected}, so this A mark is not awarded.`,
          );
        }
      }
    }

    marks.push(...rows);
    parts.push({
      part: scheme.part,
      firstWrongLine: line(ai?.firstWrongLine),
      note: ai?.note?.trim() ?? "",
    });
  }

  const score = marks.filter((m) => m.awarded).length;
  const maxScore = marks.length;
  const errorTags = [...new Set(output.errorTags.map((t) => t.trim().toLowerCase()).filter((t) => /^[a-z0-9]+(?:[-._][a-z0-9]+)*$/.test(t)))];
  return { marks, parts, score, maxScore, overrides, errorTags };
}
