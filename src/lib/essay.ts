import { z } from "zod";

/**
 * Transcription markers (kept in the editable text the teacher reviews):
 *   [X?]  the reader is unsure the character is X
 *   [X!]  the student wrote a malformed version of X (錯字 — not a real character)
 */
const MARKER = /\[([^\[\]?!])([?!])\]/g;

export const TranscriptionSchema = z.object({
  studentName: z.string().nullable(),
  title: z.string().nullable(),
  text: z.string().describe("The essay body exactly as written, with [X?] and [X!] markers; paragraphs separated by a blank line"),
});
export type Transcription = z.infer<typeof TranscriptionSchema>;

export const TRANSCRIBE_SYSTEM = `You transcribe handwritten Chinese essays by Hong Kong secondary students (Traditional Chinese, usually on 原稿紙 grid paper, written left-to-right).
Your transcription is used to find the student's wrong characters (錯別字), so you must copy EXACTLY what the student wrote, character by character:
- NEVER correct anything. If the student wrote 己 where 已 is meant, write 己. Keep wrong words, wrong punctuation and odd grammar exactly.
- If a character is malformed so that it is not a real character (e.g. an extra or missing stroke or component), write the character it is a malformed version of followed by "!" inside brackets: [武!].
- If you cannot read a character with confidence, write your best reading followed by "?" inside brackets: [已?]. Use this whenever you are unsure — the teacher will check these.
- Ignore crossed-out text and the teacher's own red marks.
- Keep the student's paragraph breaks; separate paragraphs with one blank line.
- Put the student's name (if written) in studentName and the essay title (if written) in title; do not repeat them in text.
- Pages are given in order; continue the text across pages.`;

export const AnalysisSchema = z.object({
  wrongCharacters: z.array(
    z.object({
      context: z.string().describe("4-12 characters copied EXACTLY from the text, containing the wrong character"),
      wrong: z.string().describe("The wrong character(s) exactly as in the text"),
      correct: z.string().describe("The correct character(s)"),
      explanation: z.string().describe("Short explanation in Traditional Chinese, e.g. 「已經」的「已」，不是「自己」的「己」"),
    }),
  ),
  goodSentences: z.array(
    z.object({
      quote: z.string().describe("Copied EXACTLY from the text"),
      reason: z.string().describe("Why it is good, in Traditional Chinese (e.g. 運用比喻，生動具體)"),
    }),
  ),
  problemSentences: z.array(
    z.object({
      quote: z.string().describe("Copied EXACTLY from the text"),
      issue: z.string().describe("What is wrong (病句 type), in Traditional Chinese"),
      rewrite: z.string().describe("Suggested corrected sentence"),
    }),
  ),
  overallComment: z.string().describe("2-4 sentences of encouraging, specific overall feedback in Traditional Chinese"),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const ANALYZE_SYSTEM = `你是香港中學中文科老師的助手，負責批改學生（中四至中六，文憑試程度）的中文作文。
請找出：
1. 別字 (wrongCharacters)：學生用錯的字或詞（例如「己經」應為「已經」、「再接再勵」應為「再接再厲」、「既然」誤作「即然」）。只標示你確定是錯的字。不要把香港通行的異體字或可接受的寫法當作錯字（例如 着/著、裏/裡、綫/線、啟/啓、峯/峰）。context 必須從原文逐字複製。
2. 佳句 (goodSentences)：2至5句寫得好的句子，說明好在哪裏（修辭、描寫、用詞、結構等）。quote 必須從原文逐字複製。
3. 病句 (problemSentences)：語法或用詞不當的句子（成分殘缺、搭配不當、語序不當、句式雜糅、詞不達意等），提供修改建議。quote 必須從原文逐字複製。不要把錯別字問題重複列為病句。
4. 整體評語 (overallComment)：具體、鼓勵性的評語。
所有說明用繁體中文書寫。不要評分。`;

/** Text without markers, plus definite 錯字 found from [X!] markers (position in the clean text). */
export function stripMarkers(marked: string) {
  let clean = "";
  const malformed: { index: number; char: string }[] = [];
  let last = 0;
  for (const m of marked.matchAll(MARKER)) {
    clean += marked.slice(last, m.index);
    if (m[2] === "!") malformed.push({ index: clean.length, char: m[1] });
    clean += m[1];
    last = m.index! + m[0].length;
  }
  clean += marked.slice(last);
  return { clean, malformed };
}

export function countUncertain(marked: string) {
  return [...marked.matchAll(MARKER)].filter((m) => m[2] === "?").length;
}

export type Mark = { kind: "wrong" | "good" | "problem"; id: number };

export type FeedbackItem =
  | { kind: "wrong"; id: number; start: number; end: number; wrong: string; correct: string; explanation: string; malformed: boolean }
  | { kind: "good"; id: number; start: number; end: number; quote: string; reason: string }
  | { kind: "problem"; id: number; start: number; end: number; quote: string; issue: string; rewrite: string };

/** Map AI quotes back onto positions in the clean text. Items whose quote can't be found are kept with start=-1. */
export function locateFeedback(clean: string, analysis: Analysis, malformed: { index: number; char: string }[]): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  let id = 0;
  const find = (q: string) => (q ? clean.indexOf(q) : -1);

  for (const m of malformed) {
    items.push({
      kind: "wrong", id: id++, start: m.index, end: m.index + 1, wrong: `${m.char}（寫法錯誤）`,
      correct: m.char, explanation: "字形寫錯（筆畫或部件有誤）", malformed: true,
    });
  }
  const used = new Set<number>();
  for (const w of analysis.wrongCharacters) {
    let start = -1;
    // Find the next unused occurrence of the context, so repeated mistakes each get marked.
    for (let from = 0; ; ) {
      const c = clean.indexOf(w.context, from);
      if (c < 0) break;
      const off = w.context.indexOf(w.wrong);
      const s = c + Math.max(off, 0);
      if (off >= 0 && !used.has(s)) { start = s; break; }
      from = c + 1;
    }
    if (start < 0) start = find(w.wrong);
    if (start >= 0) used.add(start);
    items.push({
      kind: "wrong", id: id++, start, end: start < 0 ? -1 : start + w.wrong.length,
      wrong: w.wrong, correct: w.correct, explanation: w.explanation, malformed: false,
    });
  }
  for (const g of analysis.goodSentences) {
    const start = find(g.quote);
    items.push({ kind: "good", id: id++, start, end: start < 0 ? -1 : start + g.quote.length, quote: g.quote, reason: g.reason });
  }
  for (const p of analysis.problemSentences) {
    const start = find(p.quote);
    items.push({
      kind: "problem", id: id++, start, end: start < 0 ? -1 : start + p.quote.length,
      quote: p.quote, issue: p.issue, rewrite: p.rewrite,
    });
  }
  return items;
}

/** Split text into runs that share the same set of marks, for rendering highlights. */
export function segmentText(clean: string, items: FeedbackItem[]) {
  const marksAt: Mark[][] = Array.from({ length: clean.length }, () => []);
  for (const it of items) {
    if (it.start < 0) continue;
    for (let i = it.start; i < it.end && i < clean.length; i++) marksAt[i].push({ kind: it.kind, id: it.id });
  }
  const runs: { text: string; marks: Mark[]; startsAt: number }[] = [];
  const key = (ms: Mark[]) => ms.map((m) => m.id).join(",");
  for (let i = 0; i < clean.length; i++) {
    const prev = runs[runs.length - 1];
    if (prev && key(prev.marks) === key(marksAt[i])) prev.text += clean[i];
    else runs.push({ text: clean[i], marks: marksAt[i], startsAt: i });
  }
  return runs;
}
