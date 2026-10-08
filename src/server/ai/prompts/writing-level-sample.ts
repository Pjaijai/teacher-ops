import { z } from "zod";
import { CHINESE_LEVEL_MARKERS, ENGLISH_LEVEL_MARKERS } from "./writing-rubric-text";

export const LevelSampleSchema = z.object({
  text: z.string().describe("The full upgraded essay; paragraphs separated by one blank line"),
  changes: z
    .array(
      z.object({
        original: z.string().describe("A sentence or passage from the student's essay, copied EXACTLY"),
        sample: z.string().describe("The corresponding sentence or passage in the upgraded essay, copied EXACTLY from text"),
        note: z.string().describe("What changed and why it reaches the target level"),
      }),
    )
    .describe("8–15 of the most instructive changes, in essay order"),
});
export type LevelSample = z.infer<typeof LevelSampleSchema>;

/** 6 and 7 stand for 5* and 5**. */
export const levelLabel = (level: number) => (level === 7 ? "5**" : level === 6 ? "5*" : String(level));

export function levelSampleSystem(subject: "chi_writing" | "eng_writing", targetLevel: number, script: "trad" | "simp" | null) {
  const target = levelLabel(targetLevel);
  if (subject === "chi_writing") {
    return `你是香港中學文憑試中國語文科的寫作老師。請把學生的作文「升格」到第${target}級的水平，示範同一篇文章如何寫得更好。
嚴格規定：
- 這是學生「自己文章」的升格版：保留學生的立意方向、主要內容、例子、情節和段落計劃，不要換成另一篇文章。
- 針對第${target}級的特徵改寫：深化立意、分析例子、改善用詞句式、修正錯別字和病句、加強段落銜接與首尾呼應。
- 篇幅與原文相若（可略長），不要過度堆砌辭藻。
- 用${script === "simp" ? "簡體字" : "繁體字"}書寫。
- changes 列出最具啟發性的改動：original 逐字複製學生原文，sample 逐字複製升格版，note 用繁體中文說明改動及其作用。
各級特徵（考評局示例歸納，5*／5** 為第5級以上更出色的表現）：
${CHINESE_LEVEL_MARKERS}`;
  }
  return `You are an HKDSE English writing teacher. Rewrite the student's own composition as a Level ${target} version, to show how the SAME piece could be written better.
Strict rules:
- Keep the student's ideas, examples, story events and paragraph plan. Do not replace it with a different piece.
- Upgrade towards Level ${target}: develop and support each point, fix every language error, widen the range of structures and precise vocabulary, strengthen cohesion and text-type conventions.
- Keep a similar length (slightly longer is fine). Natural, not decorated with "low-frequency vocabulary".
- changes: the most instructive changes; original copied EXACTLY from the student's text, sample copied EXACTLY from your text, note explaining what changed and why it reaches the target level.
Level markers (from HKEAA exemplars; 5*/5** are stronger than Level 5):
${ENGLISH_LEVEL_MARKERS}`;
}
