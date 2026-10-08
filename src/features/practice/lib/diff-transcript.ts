import type { TrackedEdit } from "@/lib/schemas/writing";

/** Line-by-line tracked edits against the AI's reading (same rule as the server's attempts.ts). */
export function diffTranscript(ai: { latex: string }[], edited: { latex: string }[]): TrackedEdit[] {
  const edits: TrackedEdit[] = [];
  for (let i = 0; i < Math.max(ai.length, edited.length); i++) {
    const before = ai[i]?.latex ?? "";
    const after = edited[i]?.latex ?? "";
    if (before.trim() !== after.trim()) edits.push({ at: i, before, after });
  }
  return edits;
}
