import { z } from "zod";
import { GRADES } from "@/server/services/writing/chinese-scoring-rules";
import { CHINESE_SCORING, ENGLISH_SCORING } from "./writing-rubric-text";

const ChineseCriterionResult = z.object({
  grade: z.enum(GRADES),
  reason: z
    .string()
    .describe("2–3 sentences in Traditional Chinese: which rubric markers you observed and how the essay compares with the anchors (refer to them as 第N級示例, never by label)"),
  comparedTo: z.array(z.string()).describe("Labels of the anchors this judgement relied on, e.g. A4"),
});

export const ChineseEstimateSchema = z.object({
  offTopic: z.boolean().describe("true only if the essay clearly fails to address the question (離題)"),
  content: ChineseCriterionResult,
  expression: ChineseCriterionResult,
  structure: ChineseCriterionResult,
  presentation: ChineseCriterionResult,
  level: z.number().int().min(1).max(5).describe("Which anchor level the essay is closest to overall"),
  levelReason: z.string().describe("Traditional Chinese: why this level and not the adjacent ones"),
});
export type ChineseEstimate = z.infer<typeof ChineseEstimateSchema>;

export const chineseEstimateSystem = (hasAnchors: boolean) => `你是香港中學文憑試中國語文科卷二乙部（命題寫作）的資深評卷員。請嚴格按照以下評分準則評分。

${CHINESE_SCORING}

評分方法：
1. ${hasAnchors ? "先閱讀各級「錨點示例」（真實考生答卷，已知等級），再閱讀待評作文。" : "（本次沒有錨點示例，請按上列各級特徵判斷。）"}
2. 逐項（內容、表達、結構、標點字體）給品第。理由須指出觀察到的評分準則特徵${hasAnchors ? "，並與錨點示例比較（稱「第4級示例」等，不要寫標籤）" : ""}。
3. 標點字體：你看到的是轉錄文字，無法判斷字體美醜；主要按標點運用評分，字體一律視作清楚可辨。
4. 錯別字由程式另行計分，你不用計算。
5. 判斷整體最接近哪一級，給出估計等級。不要因篇幅長或字體整齊而提高等級；等級主要取決於立意深度和論據／材料是否有分析。
6. 字數上限及離題上限由程式套用，你照實評品第即可，但須如實判斷是否離題。
所有說明用繁體中文。`;

const EnglishDomain = z.object({
  mark: z.number().int().min(0).max(7),
  reason: z.string().describe("2–3 sentences naming the rubric markers observed and how the script compares with the anchors (by level, never by label)"),
  comparedTo: z.array(z.string()).describe("Labels of the anchors relied on, e.g. A4"),
});

export const EnglishEstimateSchema = z.object({
  offTask: z.boolean().describe("true only if the script clearly fails to address the task"),
  content: EnglishDomain,
  language: EnglishDomain,
  organisation: EnglishDomain,
  level: z.number().int().min(1).max(5).describe("Best-fit overall level for this part"),
  levelReason: z.string(),
});
export type EnglishEstimate = z.infer<typeof EnglishEstimateSchema>;

export const englishEstimateSystem = (hasAnchors: boolean) => `You are an experienced HKDSE English Language Paper 2 marker. Mark strictly by these guidelines:

${ENGLISH_SCORING}

Method:
1. ${hasAnchors ? "Read the calibration anchors (real candidate scripts with known levels) first, then the script." : "(No anchors are available this time; judge by the level descriptors and markers above.)"}
2. Give Content, Language and Organisation a mark from 0 to 7 each, best fit. Each reason names the markers observed${hasAnchors ? " and the anchor level it was compared with" : ""}.
3. Positive marking: errors that don't block meaning don't stop a high Language mark if range and control are strong.
4. A script well under the word guide falls short on Content. Copied prompt text is disregarded.
5. Give the best-fit overall level (1–5).
Write the reasons in English.`;
