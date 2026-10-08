/**
 * Transcription markers in a student's text (pure, shared by the API and the UI):
 *   [X?]   the reader is unsure the character/word is X
 *   [X!]   malformed character (錯字, not a real character) — Chinese only; X is the intended character
 *   {+…+}  words the student inserted between lines (∨ / ⋀ marks)
 *
 * The "clean" text drops the markers and keeps their content. Every feedback position and every
 * tracked edit refers to the clean text.
 */
const ANY_MARK = /\[([^[\]?!]+)([?!])\]|\{\+([^{}]*)\+\}/g;

export type Range = { start: number; end: number };

export type StrippedText = {
  clean: string;
  /** definite 錯字 from [X!]: position of X in the clean text */
  malformed: { index: number; char: string }[];
  unsure: Range[];
  insertions: Range[];
};

export function stripMarkers(marked: string): StrippedText {
  let clean = "";
  const malformed: StrippedText["malformed"] = [];
  const unsure: Range[] = [];
  const insertions: Range[] = [];
  let last = 0;
  for (const m of marked.matchAll(ANY_MARK)) {
    clean += marked.slice(last, m.index);
    const start = clean.length;
    if (m[3] !== undefined) {
      clean += m[3];
      if (m[3].length) insertions.push({ start, end: clean.length });
    } else {
      clean += m[1];
      if (m[2] === "!") for (let i = 0; i < m[1].length; i++) malformed.push({ index: start + i, char: m[1][i] });
      else unsure.push({ start, end: clean.length });
    }
    last = m.index! + m[0].length;
  }
  clean += marked.slice(last);
  return { clean, malformed, unsure, insertions };
}

export type MarkerSegment = { kind: "text" | "unsure" | "malformed" | "insertion"; text: string };

/** Split marked text into plain and marked runs, for highlighting the transcript under review. */
export function markerSegments(marked: string): MarkerSegment[] {
  const out: MarkerSegment[] = [];
  let last = 0;
  for (const m of marked.matchAll(ANY_MARK)) {
    if (m.index! > last) out.push({ kind: "text", text: marked.slice(last, m.index) });
    if (m[3] !== undefined) out.push({ kind: "insertion", text: m[3] });
    else out.push({ kind: m[2] === "!" ? "malformed" : "unsure", text: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < marked.length) out.push({ kind: "text", text: marked.slice(last) });
  return out;
}

export function countUnsure(marked: string) {
  return [...marked.matchAll(ANY_MARK)].filter((m) => m[2] === "?").length;
}

/**
 * Length as the exam counts it: Chinese = every character except whitespace (punctuation included,
 * as HKEAA counts 字數); English = words.
 */
export function textLength(text: string, subject: "chi_writing" | "eng_writing" | string) {
  if (subject === "chi_writing") return text.replace(/\s/g, "").length;
  return (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length;
}
