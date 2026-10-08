/**
 * Official HKEAA rules for Chinese Paper 2 乙部 (rubrics/chinese-writing.md §2), applied in code
 * after the model grades: 品第 → marks, caps for off-topic and short essays, 錯別字 marks.
 */
export const GRADES = ["上上", "上中", "上下", "中上", "中中(上)", "中中(下)", "中下", "下上", "下中", "下下", "極差劣"] as const;
export type Grade = (typeof GRADES)[number];

export const gradePoints = (g: Grade) => 10 - GRADES.indexOf(g);
export const gradeOf = (points: number) => GRADES[10 - Math.max(0, Math.min(10, points))];

export const CHINESE_CRITERIA = {
  content: { name: "內容", weight: 4 },
  expression: { name: "表達", weight: 3 },
  structure: { name: "結構", weight: 2 },
  presentation: { name: "標點字體", weight: 1 },
} as const;
export type ChineseCriterion = keyof typeof CHINESE_CRITERIA;
export const CHINESE_MAX_TOTAL = 103;

/** Official caps ([SEM25] slide 44). `chars` counts punctuation, as HKEAA does. */
export function applyCaps(c: ChineseCriterion, grade: Grade, offTopic: boolean, chars: number): { grade: Grade; capped: string | null } {
  let cap = 10;
  let why: string | null = null;
  if (offTopic) {
    if (c === "content") [cap, why] = [3, "離題：內容最高下上"];
    if (c === "expression" || c === "structure") [cap, why] = [7, "離題：最高中上"];
  }
  if (c === "content") {
    const lengthCap = chars >= 550 ? 10 : chars >= 450 ? 7 : chars >= 300 ? 5 : 3;
    if (lengthCap < cap) [cap, why] = [lengthCap, `字數 ${chars}：內容最高${gradeOf(lengthCap)}`];
  }
  return gradePoints(grade) > cap ? { grade: gradeOf(cap), capped: why } : { grade, capped: null };
}

/** 0–1 個：3分；2–4個：2分；5–7個：1分；8個或以上：0分. */
export function wrongCharMarks(distinctErrors: number) {
  return distinctErrors <= 1 ? 3 : distinctErrors <= 4 ? 2 : distinctErrors <= 7 ? 1 : 0;
}

/** 重錯不計: a repeated error (same wrong → correct) counts once. */
export function distinctWrongChars(items: { wrong: string; correct: string }[]) {
  return new Set(items.map((w) => `${w.wrong}→${w.correct}`)).size;
}

/**
 * Total → level. HKEAA doesn't publish cut scores, so this is an estimate (rubric open issue 1);
 * the model's anchor-based level is used when it is within one level of this.
 */
export function levelFromTotal(total: number) {
  const pct = total / CHINESE_MAX_TOTAL;
  return pct >= 0.78 ? 5 : pct >= 0.66 ? 4 : pct >= 0.54 ? 3 : pct >= 0.4 ? 2 : 1;
}
