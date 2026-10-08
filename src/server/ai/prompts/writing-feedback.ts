import { z } from "zod";
import { CHINESE_LEVEL_MARKERS, CHINESE_WRONG_CHAR_RULES, ENGLISH_ERROR_TAGS, ENGLISH_LEVEL_MARKERS } from "./writing-rubric-text";

/** rubrics/english-writing.md §5 — the tags that drive the weakness profile. */
export const ENGLISH_ERROR_TAG_IDS = [
  "en.sva", "en.verb_form", "en.tense_consistency", "en.tense_choice", "en.passive", "en.missing_be", "en.double_verb",
  "en.article", "en.count_noun", "en.relative_clause", "en.pronoun_case", "en.preposition_pattern", "en.word_form",
  "en.word_choice", "en.misused_idiom", "en.l1_transfer", "en.run_on", "en.fragment", "en.double_subject",
  "en.comparative", "en.dangling_modifier", "en.spelling", "en.register", "en.convention", "en.template_linkers", "en.task_copy",
] as const;

/** 病句 types (tags zh.sentence.<type>). */
export const CHINESE_SENTENCE_ISSUES = ["成分殘缺", "搭配不當", "語序不當", "句式雜糅", "詞不達意", "累贅重複", "邏輯不通", "標點不當", "口語化"] as const;

const TaskRecap = z.object({
  verdict: z.enum(["met", "partly", "not_met"]),
  summary: z.string().describe("2–3 sentences: did the essay do what the task asked?"),
  points: z
    .array(z.object({ requirement: z.string(), met: z.boolean(), comment: z.string() }))
    .describe("One row per task requirement (topic, text type, audience, purpose, each required point)"),
});

const Upgrades = {
  vocabUpgrades: z
    .array(
      z.object({
        quote: z.string().describe("The student's sentence or phrase, copied EXACTLY"),
        original: z.string().describe("The word or phrase to upgrade (inside quote)"),
        upgrades: z.array(z.string()).describe("1–3 more precise or vivid alternatives"),
        note: z.string().describe("Why the upgrade is better here"),
      }),
    )
    .describe("3–6 items"),
  structureUpgrades: z
    .array(
      z.object({
        quote: z.string().describe("The student's sentence, copied EXACTLY"),
        rewrite: z.string().describe("The same idea with a stronger sentence structure"),
        note: z.string().describe("What the new structure does better"),
      }),
    )
    .describe("2–4 items"),
};

const Overall = z.object({
  comment: z.string().describe("3–5 sentences of specific, encouraging overall feedback"),
  nextSteps: z.array(z.string()).describe("2–3 concrete things to work on next time"),
});

export const ChineseFeedbackSchema = z.object({
  taskRecap: TaskRecap,
  strengths: z.array(z.object({ point: z.string(), quote: z.string().nullable().describe("Supporting quote copied EXACTLY, or null") })),
  wrongCharacters: z.array(
    z.object({
      context: z.string().describe("4–12 characters copied EXACTLY from the text, containing the wrong character"),
      wrong: z.string().describe("The wrong character(s) exactly as in the text"),
      correct: z.string(),
      explanation: z.string().describe("e.g. 「已經」的「已」，不是「自己」的「己」"),
    }),
  ),
  problemSentences: z.array(
    z.object({
      quote: z.string().describe("Copied EXACTLY from the text"),
      type: z.enum(CHINESE_SENTENCE_ISSUES),
      issue: z.string(),
      rewrite: z.string(),
    }),
  ),
  goodSentences: z.array(z.object({ quote: z.string().describe("Copied EXACTLY"), reason: z.string() })).describe("2–5 sentences"),
  ...Upgrades,
  overall: Overall,
});
export type ChineseFeedback = z.infer<typeof ChineseFeedbackSchema>;

export const EnglishFeedbackSchema = z.object({
  taskRecap: TaskRecap,
  strengths: z.array(z.object({ point: z.string(), quote: z.string().nullable().describe("Supporting quote copied EXACTLY, or null") })),
  errors: z
    .array(
      z.object({
        quote: z.string().describe("The smallest stretch of text containing the error, copied EXACTLY (a few words)"),
        tag: z.enum(ENGLISH_ERROR_TAG_IDS),
        correction: z.string().describe("The corrected words"),
        explanation: z.string().describe("One short sentence explaining the rule"),
      }),
    )
    .describe("Every clear language error (list repeats separately), most important first, at most 40"),
  goodSentences: z.array(z.object({ quote: z.string().describe("Copied EXACTLY"), reason: z.string() })).describe("2–4 sentences"),
  ...Upgrades,
  overall: Overall,
});
export type EnglishFeedback = z.infer<typeof EnglishFeedbackSchema>;

export const CHINESE_FEEDBACK_SYSTEM = `你是香港中學文憑試中國語文科的資深寫作老師，批改學生（中四至中六）的作文，給予具體、有建設性的回饋。不要評分（評分另行處理）。

請提供：
1. taskRecap「解題回顧」：文章是否切合題目要求（題旨、文體、對象、目的、指定要點）。
2. strengths 2–4項優點，盡量引用原文。
3. wrongCharacters 錯別字：只列確定是錯的字。按考評局規則：
${CHINESE_WRONG_CHAR_RULES}
   - 規範簡化字或繁簡混用都「不是」錯別字（另有程式檢查繁簡混用），香港通行異體字（着/著、裏/裡、綫/線、啓/啟、峯/峰、衞/衛）也不是。
   - 每次出現都要列出（重複的錯誤也逐一列出，計分時程式會只計一次）。context 必須逐字複製原文。
4. problemSentences 病句：成分殘缺、搭配不當、語序不當、句式雜糅、詞不達意等，附修改。不要把錯別字重複列作病句。
5. goodSentences 佳句 2–5句，說明好在哪裏（修辭、描寫、用詞、結構）。
6. vocabUpgrades 用詞提升、structureUpgrades 句式提升：每項都要扣連學生的原句（quote 逐字複製）。
7. overall 整體評語及下一步。

參考以下各級特徵（從考評局示例歸納），指出學生距離下一級的差距（例如立意深度、例子有否分析）：
${CHINESE_LEVEL_MARKERS}

規定：所有 quote / context 必須從原文逐字複製；所有說明用繁體中文。`;

export const ENGLISH_FEEDBACK_SYSTEM = `You are an experienced HKDSE English Language writing teacher giving a Secondary 4–6 student specific, constructive feedback on their composition. Do not give marks (scoring is separate).

Provide:
1. taskRecap: did the writing do what the task asked (topic, text type and its conventions, audience, purpose, every required point)?
2. strengths: 2–4 strengths, quoting the text where possible.
3. errors: every clear language error, tagged with exactly one tag from this taxonomy:
${ENGLISH_ERROR_TAGS}
   The quote must be the smallest stretch of text containing the error (a few words), copied EXACTLY.
4. goodSentences: 2–4 effective sentences and why they work.
5. vocabUpgrades and structureUpgrades, each tied to the student's own sentence (quote copied EXACTLY).
6. overall: comment and next steps.

Use these level markers (distilled from HKEAA exemplars) to explain what would move the script up a level:
${ENGLISH_LEVEL_MARKERS}

Rules: every quote must be copied EXACTLY from the text; write all feedback in English.`;
