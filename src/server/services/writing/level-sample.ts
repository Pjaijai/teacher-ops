import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { LevelSampleSchema, levelSampleSystem } from "@/server/ai/prompts/writing-level-sample";
import type { WritingSubject } from "./writing-common";

/** Default target: one level above the estimate (5 → 5*, 5* → 5**), or Level 4 without an estimate. */
export function defaultTargetLevel(estimateLevel: number | null) {
  return estimateLevel ? Math.min(7, estimateLevel + 1) : 4;
}

/**
 * An upgraded rewrite of the student's OWN essay at the target level (top model): same ideas,
 * examples and plan, with notes on each change. Only after feedback, never before writing.
 */
export async function writeLevelSample(opts: {
  subject: WritingSubject;
  targetLevel: number;
  task: string;
  text: string;
  feedbackSummary: string;
  script: "trad" | "simp" | null;
  onUsage: UsageSink;
}) {
  const sample = await askStructured({
    purpose: "writing_level_sample",
    tier: "top",
    system: levelSampleSystem(opts.subject, opts.targetLevel, opts.script),
    text: `TASK\n${opts.task}\n\nFEEDBACK ALREADY GIVEN\n${opts.feedbackSummary}\n\nSTUDENT'S ESSAY\n${opts.text}`,
    schema: LevelSampleSchema,
    onUsage: opts.onUsage,
  });
  // Drop empty changes; the compare view locates both sides in the texts.
  const changes = sample.changes.filter((c) => c.original.trim() && c.sample.trim());
  return { text: sample.text, changes };
}
