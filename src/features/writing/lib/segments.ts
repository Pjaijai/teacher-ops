/** A highlighted span on the essay text. Positions are in the clean text. */
export type TextMark = { id: string; start: number; end: number; kind: MarkKind };

export type MarkKind =
  | "wrong_char"
  | "mixed_script"
  | "eng_error"
  | "problem_sentence"
  | "good_sentence"
  | "vocab_upgrade"
  | "structure_upgrade"
  | "strength"
  | "edit"
  | "unsure"
  | "insertion"
  | "change";

/** Which mark is drawn on top when spans overlap (lower = stronger). */
const PRIORITY: MarkKind[] = [
  "wrong_char",
  "mixed_script",
  "eng_error",
  "edit",
  "problem_sentence",
  "vocab_upgrade",
  "structure_upgrade",
  "good_sentence",
  "strength",
  "change",
  "unsure",
  "insertion",
];

export type Segment = { text: string; start: number; marks: TextMark[] };

/** Split the text at every mark boundary; each segment carries the marks covering it, strongest first. */
export function segmentText(text: string, marks: TextMark[]): Segment[] {
  const valid = marks.filter((m) => m.start >= 0 && m.end > m.start && m.start < text.length);
  const cuts = new Set<number>([0, text.length]);
  for (const m of valid) {
    cuts.add(m.start);
    cuts.add(Math.min(m.end, text.length));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    if (a === b) continue;
    const covering = valid
      .filter((m) => m.start <= a && m.end >= b)
      .sort((x, y) => PRIORITY.indexOf(x.kind) - PRIORITY.indexOf(y.kind));
    out.push({ text: text.slice(a, b), start: a, marks: covering });
  }
  return out;
}

/** Display label for a level: 6 and 7 are 5* and 5**. */
export const levelLabel = (level: number) => (level === 7 ? "5**" : level === 6 ? "5*" : String(level));
