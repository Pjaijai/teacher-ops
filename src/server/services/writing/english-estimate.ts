import { textLength } from "@/features/writing/lib/text-markers";
import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { EnglishEstimateSchema, englishEstimateSystem } from "@/server/ai/prompts/writing-estimate";
import type { Db } from "@/server/db/client";
import { anchorLabel, retrieveAnchors, type EstimateResult, type ScoreRow } from "./chinese-estimate";

const DOMAINS = ["content", "language", "organisation"] as const;

/**
 * DSE estimate for English Part A or B (rubrics/english-writing.md §6): C, L and O 0–7 each, best
 * fit, calibrated on one anchor per level when the English corpus exists.
 */
export async function estimateEnglish(opts: {
  db: Db | null;
  text: string;
  task: string;
  part: "A" | "B";
  textType: string | null;
  wordGuide: number | null;
  onUsage: UsageSink;
}): Promise<EstimateResult> {
  const words = textLength(opts.text, "eng_writing");
  const anchors = await retrieveAnchors(opts.db, "eng_writing", opts.text, opts.part, opts.textType);
  const anchorText = anchors.map((a) => `[Anchor ${anchorLabel(a)} | Level ${a.level}]\n${a.text}`).join("\n\n");

  const out = await askStructured({
    purpose: "writing_estimate_english",
    tier: "top",
    system: englishEstimateSystem(anchors.length > 0),
    text:
      `${anchorText ? `${anchorText}\n\n==========\n` : ""}TASK (Part ${opts.part})\n${opts.task}\n\n` +
      `SCRIPT (${words} words${opts.wordGuide ? `; word guide about ${opts.wordGuide}` : ""})\n${opts.text}`,
    schema: EnglishEstimateSchema,
    onUsage: opts.onUsage,
  });

  const idsFor = (labels: string[]) => anchors.filter((a) => labels.includes(anchorLabel(a))).map((a) => a.chunkId);
  const scores: ScoreRow[] = DOMAINS.map((d) => ({
    criterion: d,
    grade: `${out[d].mark}/7`,
    marks: out[d].mark,
    maxMarks: 7,
    reason: out[d].reason,
    anchorIds: idsFor(out[d].comparedTo),
  }));
  return {
    part: opts.part,
    scores,
    totalMarks: scores.reduce((s, r) => s + r.marks, 0),
    maxMarks: 21,
    level: out.level,
    levelReason: out.levelReason,
  };
}
