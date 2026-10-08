import { z } from "zod";
import type { HelperKind } from "@/lib/schemas/writing";

/**
 * Ask-AI helpers before writing. Scaffolding only: plans, notes, words and patterns — never full
 * paragraphs or an essay. Chinese tasks get Traditional Chinese, English tasks get English.
 */
export const HELPER_SCHEMAS = {
  task_analysis: z.object({
    asks: z.string().describe("What the task really asks, in 1–3 sentences"),
    textType: z.string().describe("Text type / genre and its key conventions"),
    audience: z.string(),
    purpose: z.string(),
    toneRegister: z.string().describe("Tone and register to use"),
    keyRequirements: z.array(z.string()).describe("Every requirement the answer must cover"),
    traps: z.array(z.string()).describe("Common ways to misread the task or lose marks"),
    prepare: z.array(z.string()).describe("What to prepare or decide before writing"),
  }),
  outline: z.object({
    centralIdea: z.string().describe("The central idea / thesis, as a short note (not a full opening sentence)"),
    paragraphs: z
      .array(
        z.object({
          role: z.string().describe("e.g. 起／承／轉／合, Introduction, Body 1, Counter-argument, Conclusion"),
          points: z.array(z.string()).describe("2–4 brief point notes, max ~20 words / 30 字 each — notes, not sentences to copy"),
        }),
      )
      .describe("4–7 paragraphs"),
    tips: z.array(z.string()).describe("2–3 tips to lift the plan a level (e.g. deepen the idea, analyse an example)"),
  }),
  vocabulary: z.object({
    groups: z.array(
      z.object({
        theme: z.string(),
        items: z.array(
          z.object({
            word: z.string(),
            meaning: z.string(),
            synonyms: z.array(z.string()).describe("2–4 synonyms or near-synonyms, with nuance in the note"),
            note: z.string().describe("Usage note: nuance, collocation, register"),
          }),
        ),
      }),
    ),
  }),
  sentence_patterns: z.object({
    patterns: z.array(
      z.object({
        pattern: z.string().describe("The pattern, e.g. 「與其……不如……」 or 'Not only … but also …' (inversion)"),
        use: z.string().describe("When and why to use it in this task"),
        example: z.string().describe("ONE short example sentence (max ~25 words / 35 字) on a related but different point"),
      }),
    ),
  }),
  idioms: z.object({
    items: z.array(
      z.object({
        idiom: z.string().describe("成語 / idiom / collocation"),
        meaning: z.string(),
        usage: z.string().describe("How to use it correctly and common misuse"),
        example: z.string().describe("ONE short example sentence (max ~25 words / 35 字)"),
      }),
    ),
  }),
} as const satisfies Record<HelperKind, z.ZodType>;

export type HelperContent = { [K in HelperKind]: z.infer<(typeof HELPER_SCHEMAS)[K]> };

const WHAT: Record<HelperKind, { zh: string; en: string }> = {
  task_analysis: {
    zh: "「解題」：分析題目要求、文體及其格式要點、對象、目的、語氣，指出審題陷阱，以及寫作前要準備甚麼。",
    en: "Task analysis: what the task asks, the text type and its conventions, audience, purpose, tone and register, traps, and what to prepare.",
  },
  outline: {
    zh: "「寫作大綱」：段落計劃。每段只列要點筆記（短語），讓學生自己寫成文章。",
    en: "Outline: a paragraph plan. Each paragraph gets brief point notes (phrases) that the student will develop themselves.",
  },
  vocabulary: {
    zh: "「詞彙」：與題目相關的詞語，分主題列出，每個詞附近義詞及用法說明（分辨細微差別、搭配）。12–20個詞。",
    en: "Vocabulary: topic words grouped by theme, each with synonyms and a usage note (nuance, collocation, register). 12–20 words.",
  },
  sentence_patterns: {
    zh: "「句式」：6–8個適合本題的句式（例如關聯句、排比、設問、對比），每個附一句簡短例句。",
    en: "Sentence patterns: 6–8 structures that suit this task (e.g. inversion, participle openers, cleft sentences, concession), each with ONE short example.",
  },
  idioms: {
    zh: "「成語」：8–12個適合本題的成語或四字詞，附解釋、用法（包括常見誤用）及一句簡短例句。",
    en: "Idioms: 8–12 idioms, fixed phrases or strong collocations that suit this task, with meaning, usage (and common misuse) and ONE short example.",
  },
};

export function helperSystem(kind: HelperKind, subject: "chi_writing" | "eng_writing") {
  if (subject === "chi_writing") {
    return `你是香港中學文憑試中國語文科的寫作老師，正在幫學生在動筆前準備。
任務：${WHAT[kind].zh}
嚴格規定：
- 只提供鷹架（scaffolding）：要點、詞語、句式、短例句。絕對不可寫出完整段落、開首段、結尾段或整篇文章，例句不可直接用作文章段落。
- 例句須談與題目相關但不同的內容，避免學生照抄。
- 全部用繁體中文。
- 切合文憑試要求（立意要深、例子要分析、結構要有層次）。`;
  }
  return `You are an HKDSE English writing teacher helping a student prepare before they write.
Task: ${WHAT[kind].en}
Strict rules:
- Scaffolding only: notes, words, patterns and short examples. NEVER write full paragraphs, an introduction, a conclusion or the essay.
- Example sentences must be about a related but different point, so they can't be copied into the answer.
- Write in English.
- Aim at HKDSE Level 5 expectations (every point developed and supported, a sense of audience, purposeful cohesion).`;
}
