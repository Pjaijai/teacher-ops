import type { TrackedEdit } from "@/lib/schemas/writing";

/**
 * What the student changed in the AI's reading of their handwriting. Both texts are clean (markers
 * stripped), so confirming an unsure character ([已?] → 已) is not an edit. Chinese is compared
 * character by character, English word by word. `at` is the position in the edited text.
 */
export function trackEdits(aiClean: string, editedClean: string): TrackedEdit[] {
  if (aiClean === editedClean) return [];
  const a = tokenize(aiClean);
  const b = tokenize(editedClean);

  // Trim the common prefix and suffix, then diff the middle.
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const am = a.slice(pre, a.length - suf);
  const bm = b.slice(pre, b.length - suf);
  const startPos = b.slice(0, pre).join("").length;

  const ops = am.length * bm.length > 4_000_000 ? [{ before: am.join(""), after: bm.join("") }] : null;
  const edits: TrackedEdit[] = [];
  if (ops) {
    edits.push({ at: startPos, before: ops[0].before, after: ops[0].after });
    return edits;
  }

  // LCS table (suffix form) over tokens.
  const n = am.length;
  const m = bm.length;
  const w = m + 1;
  const lcs = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] = am[i] === bm[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    }
  }

  let i = 0;
  let j = 0;
  let pos = startPos;
  let cur: TrackedEdit | null = null;
  const flush = () => {
    if (cur && (cur.before || cur.after)) edits.push(cur);
    cur = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && am[i] === bm[j]) {
      flush();
      pos += bm[j].length;
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i * w + j + 1] >= lcs[(i + 1) * w + j])) {
      cur ??= { at: pos, before: "", after: "" };
      cur.after += bm[j];
      pos += bm[j].length;
      j++;
    } else {
      cur ??= { at: pos, before: "", after: "" };
      cur.before += am[i];
      i++;
    }
  }
  flush();
  return edits;
}

/** CJK characters one by one, Latin words whole, whitespace runs, any other character alone. */
export function tokenize(text: string): string[] {
  return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*|\s+|[\s\S]/gu) ?? [];
}
