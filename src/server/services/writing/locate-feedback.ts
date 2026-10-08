/**
 * Map quotes the AI copied from the essay back to positions in the clean text. The model sometimes
 * changes whitespace, full-width/half-width punctuation or quote marks, so an exact search is
 * followed by a normalised one, then by a prefix search.
 */
export type Span = { start: number; end: number };

const PUNCT: Record<string, string> = {
  "，": ",", "。": ".", "！": "!", "？": "?", "：": ":", "；": ";", "（": "(", "）": ")",
  "「": '"', "」": '"', "『": '"', "』": '"', "“": '"', "”": '"', "‘": "'", "’": "'", "、": ",",
  "〈": "<", "〉": ">", "《": "<", "》": ">", "—": "-", "–": "-", "…": ".",
};

/** Normalised text plus, for every normalised character, its index in the original. */
function normalise(s: string) {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) continue;
    out += (PUNCT[ch] ?? ch).toLowerCase();
    map.push(i);
  }
  return { out, map };
}

export class TextLocator {
  private norm: { out: string; map: number[] };

  constructor(readonly text: string) {
    this.norm = normalise(text);
  }

  /** First occurrence at or after `from` whose start isn't in `used` (so repeated errors each get a mark). */
  find(quote: string, opts: { from?: number; used?: Set<number> } = {}): Span | null {
    const q = quote.trim();
    if (!q) return null;
    const used = opts.used;
    for (let from = opts.from ?? 0; ; ) {
      const s = this.text.indexOf(q, from);
      if (s < 0) break;
      if (!used?.has(s)) return { start: s, end: s + q.length };
      from = s + 1;
    }
    const nq = normalise(q).out;
    if (nq) {
      for (let from = 0; ; ) {
        const s = this.norm.out.indexOf(nq, from);
        if (s < 0) break;
        const start = this.norm.map[s];
        const end = this.norm.map[s + nq.length - 1] + 1;
        if (start >= (opts.from ?? 0) && !used?.has(start)) return { start, end };
        from = s + 1;
      }
    }
    // The model may have trimmed or changed the end of a long quote: match a prefix.
    if (nq.length >= 12) {
      const head = nq.slice(0, Math.max(8, Math.floor(nq.length / 2)));
      const s = this.norm.out.indexOf(head);
      if (s >= 0) {
        const start = this.norm.map[s];
        const endIdx = Math.min(s + nq.length, this.norm.out.length) - 1;
        return { start, end: this.norm.map[endIdx] + 1 };
      }
    }
    return null;
  }

  /**
   * A wrong character inside its context, e.g. context 「我己經到了」, wrong 「己」. Finds the next unused
   * occurrence of the context so a repeated mistake is marked each time it appears.
   */
  findInContext(context: string, wrong: string, used: Set<number>): Span | null {
    const off = context.indexOf(wrong);
    if (context && off >= 0) {
      for (let from = 0; ; ) {
        const c = this.text.indexOf(context, from);
        if (c < 0) break;
        const s = c + off;
        if (!used.has(s)) return { start: s, end: s + wrong.length };
        from = c + 1;
      }
      const ctx = this.find(context);
      if (ctx) {
        const inner = this.text.slice(ctx.start, ctx.end).indexOf(wrong);
        if (inner >= 0 && !used.has(ctx.start + inner)) return { start: ctx.start + inner, end: ctx.start + inner + wrong.length };
      }
    }
    return this.find(wrong, { used });
  }
}
