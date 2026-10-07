import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { askStructured } from "./ai";
import { loadCorpus, search, type SearchHit } from "./corpus";
import { embed } from "./embed";

/**
 * DSE-style scoring of a Chinese Paper 2 乙部 essay, following rubrics/chinese-writing.md.
 * The model grades each criterion against retrieved exemplar anchors (one per level);
 * code applies the official caps and turns grades into marks.
 */

export const GRADES = ["上上", "上中", "上下", "中上", "中中(上)", "中中(下)", "中下", "下上", "下中", "下下", "極差劣"] as const;
export type Grade = (typeof GRADES)[number];
const points = (g: Grade) => 10 - GRADES.indexOf(g);
const gradeOf = (p: number) => GRADES[10 - p];

export const CRITERIA = {
  content: { name: "內容", weight: 4 },
  expression: { name: "表達", weight: 3 },
  structure: { name: "結構", weight: 2 },
  presentation: { name: "標點字體", weight: 1 },
} as const;
export type Criterion = keyof typeof CRITERIA;

const CriterionResult = z.object({
  grade: z.enum(GRADES),
  reason: z.string().describe("2-3 sentences in Traditional Chinese: which rubric markers you observed, compared with which anchor"),
  comparedTo: z.array(z.string()).describe("Anchor ids this judgement relied on, e.g. chi-2024-L4-3"),
});

export const ScoreSchema = z.object({
  offTopic: z.boolean().describe("true only if the essay clearly fails to address the question (離題)"),
  wrongCharacters: z
    .array(z.object({ wrong: z.string(), correct: z.string(), context: z.string() }))
    .describe("錯別字 by HKEAA rules: list each distinct error once. Valid simplified characters and mixing scripts are NOT errors; 繁簡同體 and missing/extra components ARE."),
  content: CriterionResult,
  expression: CriterionResult,
  structure: CriterionResult,
  presentation: CriterionResult,
  level: z.number().int().min(1).max(5).describe("Estimated level: which anchor's level this essay is closest to overall"),
  levelReason: z.string().describe("Traditional Chinese: why this level and not the adjacent ones"),
});
export type ScoreOutput = z.infer<typeof ScoreSchema>;

export type ChineseScore = {
  criteria: Record<Criterion, { grade: Grade; aiGrade: Grade; marks: number; max: number; reason: string; comparedTo: string[]; capped: string | null }>;
  wrongCharacters: ScoreOutput["wrongCharacters"];
  wrongCharMarks: number;
  total: number;
  level: number;
  levelReason: string;
  charCount: number;
  offTopic: boolean;
  anchors: { id: string; level: number | null; questionNo: string | null; similarity: number }[];
};

let rubricCache: string | null = null;
/** Sections 2–4 of the rubric (scoring rules, level descriptors, distilled markers). */
function rubricText() {
  if (rubricCache) return rubricCache;
  const md = fs.readFileSync(path.join(process.cwd(), "rubrics", "chinese-writing.md"), "utf8");
  const start = md.indexOf("## 2.");
  const end = md.indexOf("## 5.");
  return (rubricCache = md.slice(start, end));
}

const SYSTEM = () => `你是香港中學文憑試中國語文科卷二乙部（命題寫作）的資深評卷員。請嚴格按照以下評分準則評分。

${rubricText()}

評分方法：
1. 先閱讀各級「錨點示例」（真實考生答卷，已知等級），再閱讀待評作文。
2. 逐項（內容、表達、結構、標點字體）給品第。理由須指出觀察到的評分準則特徵，並與錨點示例比較（例如「論據有分析，勝於 chi-2024-L4-3」）。
3. 標點字體：你看到的是轉錄文字，無法判斷字體美醜；主要按標點運用評分，字體一律視作清楚可辨。
4. 錯別字按考評局規則：繁體字或規範簡化字均可接受，繁簡混用不算錯；重錯只列一次。
5. 判斷整體最接近哪一級的錨點示例，給出估計等級。不要因篇幅長或字體整齊而提高等級；等級主要取決於立意深度和論據／材料是否有分析。
所有說明用繁體中文。`;

/** Characters counted as HKEAA does: everything except whitespace (punctuation included). */
export function countChars(text: string) {
  return text.replace(/\s/g, "").length;
}

/** One anchor per level, preferring the same question, most similar first. */
async function pickAnchors(text: string, questionNo: string | null) {
  const corpus = loadCorpus("chi_writing");
  const [query] = await embed([text]);
  const hits = search(corpus, query, { wholeDocuments: true, limit: 1000 });
  const anchors: SearchHit[] = [];
  for (const level of [5, 4, 3, 2, 1]) {
    const atLevel = hits
      .filter((h) => h.document.level === level)
      .map((h) => ({ h, s: h.score + (questionNo && h.document.questionNo === questionNo ? 0.05 : 0) }))
      .sort((a, b) => b.s - a.s);
    if (atLevel[0]) anchors.push(atLevel[0].h);
  }
  return anchors;
}

function applyCaps(c: Criterion, grade: Grade, offTopic: boolean, chars: number): { grade: Grade; capped: string | null } {
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
  return points(grade) > cap ? { grade: gradeOf(cap), capped: why } : { grade, capped: null };
}

export function wrongCharMarks(n: number) {
  return n <= 1 ? 3 : n <= 4 ? 2 : n <= 7 ? 1 : 0;
}

export async function scoreChinese(input: { text: string; title?: string | null; questionNo?: string | null }): Promise<ChineseScore> {
  const charCount = countChars(input.text);
  const anchors = await pickAnchors(input.text, input.questionNo ?? null);

  const anchorText = anchors
    .map((a) => `【錨點 ${a.document.id}｜第${a.document.level}級｜第${a.document.questionNo ?? "?"}題｜${a.document.genre ?? ""}】\n${a.document.text}`)
    .join("\n\n");

  const out = await askStructured({
    name: "chinese_essay_score",
    system: SYSTEM(),
    text: `${anchorText}\n\n==========\n待評作文${input.title ? `（題目：${input.title}）` : ""}${input.questionNo ? `（第${input.questionNo}題）` : ""}，共 ${charCount} 字（標點計算在內）：\n${input.text}`,
    schema: ScoreSchema,
  });

  // A repeated error counts once.
  const distinct = [...new Map(out.wrongCharacters.map((w) => [`${w.wrong}→${w.correct}`, w])).values()];

  const criteria = {} as ChineseScore["criteria"];
  for (const c of Object.keys(CRITERIA) as Criterion[]) {
    const r = out[c];
    const { grade, capped } = applyCaps(c, r.grade, out.offTopic, charCount);
    criteria[c] = {
      grade, aiGrade: r.grade, capped, reason: r.reason, comparedTo: r.comparedTo,
      marks: points(grade) * CRITERIA[c].weight, max: 10 * CRITERIA[c].weight,
    };
  }
  const wcMarks = wrongCharMarks(distinct.length);
  const total = Object.values(criteria).reduce((s, c) => s + c.marks, 0) + wcMarks;

  return {
    criteria, wrongCharacters: distinct, wrongCharMarks: wcMarks, total,
    level: out.level, levelReason: out.levelReason, charCount, offTopic: out.offTopic,
    anchors: anchors.map((a) => ({ id: a.document.id, level: a.document.level, questionNo: a.document.questionNo, similarity: a.score })),
  };
}
