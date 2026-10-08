import type { StrippedText } from "@/features/writing/lib/text-markers";
import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { CHINESE_FEEDBACK_SYSTEM, ChineseFeedbackSchema } from "@/server/ai/prompts/writing-feedback";
import type { writingFeedback } from "@/server/db/schema";
import { TextLocator, type Span } from "./locate-feedback";
import type { ScriptCheck } from "./script-check";

export type FeedbackDraft = Omit<typeof writingFeedback.$inferInsert, "id" | "submissionId">;

const at = (span: Span | null) => ({ startPos: span?.start ?? null, endPos: span?.end ?? null });

/** Rows shared by both languages: 解題 recap, strengths, 佳句, upgrades, overall. */
export function commonRows(
  loc: TextLocator,
  fb: {
    taskRecap: unknown;
    strengths: { point: string; quote: string | null }[];
    goodSentences: { quote: string; reason: string }[];
    vocabUpgrades: { quote: string; original: string; upgrades: string[]; note: string }[];
    structureUpgrades: { quote: string; rewrite: string; note: string }[];
    overall: { comment: string; nextSteps: string[] };
  },
): FeedbackDraft[] {
  const rows: FeedbackDraft[] = [{ kind: "task_recap", ...at(null), payload: fb.taskRecap as Record<string, unknown>, tags: [], criterion: "content" }];
  for (const s of fb.strengths) rows.push({ kind: "strength", ...at(s.quote ? loc.find(s.quote) : null), payload: s, tags: [], criterion: null });
  for (const g of fb.goodSentences) rows.push({ kind: "good_sentence", ...at(loc.find(g.quote)), payload: g, tags: [], criterion: "expression" });
  for (const v of fb.vocabUpgrades) {
    // Mark just the word being upgraded when we can find it inside the sentence.
    const sentence = loc.find(v.quote);
    const inner = sentence ? loc.text.slice(sentence.start, sentence.end).indexOf(v.original) : -1;
    const span = sentence && inner >= 0 ? { start: sentence.start + inner, end: sentence.start + inner + v.original.length } : sentence;
    rows.push({ kind: "vocab_upgrade", ...at(span), payload: v, tags: [], criterion: "expression" });
  }
  for (const s of fb.structureUpgrades) rows.push({ kind: "structure_upgrade", ...at(loc.find(s.quote)), payload: s, tags: [], criterion: "expression" });
  rows.push({ kind: "overall", ...at(null), payload: fb.overall, tags: [], criterion: null });
  return rows;
}

export type ChineseFeedbackResult = {
  rows: FeedbackDraft[];
  /** every 錯別字 occurrence (malformed + AI), for the 錯別字 mark (重錯不計 is applied by the scorer) */
  wrongChars: { wrong: string; correct: string }[];
};

/** AI feedback (top model) plus code-found 錯字 ([X!]) and 繁簡混用, all located on the clean text. */
export async function chineseFeedback(opts: {
  essay: StrippedText;
  task: string;
  title?: string | null;
  script: ScriptCheck;
  onUsage: UsageSink;
}): Promise<ChineseFeedbackResult> {
  const { clean, malformed } = opts.essay;
  const fb = await askStructured({
    purpose: "writing_feedback_chinese",
    tier: "top",
    system: CHINESE_FEEDBACK_SYSTEM,
    text: `【題目】\n${opts.task}\n\n【學生作文】${opts.title ? `（自擬題目：${opts.title}）` : ""}\n${clean}`,
    schema: ChineseFeedbackSchema,
    onUsage: opts.onUsage,
  });

  const loc = new TextLocator(clean);
  const rows: FeedbackDraft[] = [];
  const wrongChars: ChineseFeedbackResult["wrongChars"] = [];
  const used = new Set<number>();

  // Malformed characters the transcriber marked [X!] are definite 錯字.
  for (const m of malformed) {
    used.add(m.index);
    wrongChars.push({ wrong: `${m.char}!`, correct: m.char });
    rows.push({
      kind: "wrong_char",
      startPos: m.index,
      endPos: m.index + 1,
      payload: { wrong: m.char, correct: m.char, explanation: "字形寫錯（筆畫或部件有誤）", malformed: true },
      tags: [`zh.char.malformed.${m.char}`],
      criterion: "wrong_chars",
    });
  }
  for (const w of fb.wrongCharacters) {
    if (!w.wrong || w.wrong === w.correct) continue;
    const span = loc.findInContext(w.context, w.wrong, used);
    if (span) used.add(span.start);
    wrongChars.push({ wrong: w.wrong, correct: w.correct });
    rows.push({
      kind: "wrong_char",
      ...at(span),
      payload: { wrong: w.wrong, correct: w.correct, explanation: w.explanation, malformed: false, context: w.context },
      tags: [`zh.char.${w.wrong}→${w.correct}`],
      criterion: "wrong_chars",
    });
  }
  for (const f of opts.script.flags) {
    rows.push({
      kind: "mixed_script",
      startPos: f.index,
      endPos: f.index + 1,
      payload: { char: f.char, suggestion: f.suggestion, dominant: opts.script.dominant },
      tags: ["zh.mixed_script"],
      criterion: null,
    });
  }
  for (const p of fb.problemSentences) {
    rows.push({ kind: "problem_sentence", ...at(loc.find(p.quote)), payload: p, tags: [`zh.sentence.${p.type}`], criterion: "expression" });
  }
  rows.push(...commonRows(loc, fb));
  return { rows, wrongChars };
}
