import { textLength } from "@/features/writing/lib/text-markers";
import { embedOne } from "@/server/ai/embed";
import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { ChineseEstimateSchema, chineseEstimateSystem } from "@/server/ai/prompts/writing-estimate";
import type { Db } from "@/server/db/client";
import { hasAnchors, pickLevelAnchors, type CorpusHit } from "@/server/services/retrieval/search-corpus";
import {
  CHINESE_CRITERIA,
  CHINESE_MAX_TOTAL,
  applyCaps,
  distinctWrongChars,
  gradePoints,
  levelFromTotal,
  wrongCharMarks,
  type ChineseCriterion,
} from "./chinese-scoring-rules";

export type ScoreRow = { criterion: string; grade: string; marks: number; maxMarks: number; reason: string; anchorIds: string[] };
export type EstimateResult = { part: "A" | "B"; scores: ScoreRow[]; totalMarks: number; maxMarks: number; level: number; levelReason: string };

/** Anchors are labelled A5…A1 in the prompt; the ids stay internal. */
export const anchorLabel = (a: CorpusHit) => `A${a.level ?? "?"}`;

/**
 * Calibration anchors (one whole exemplar per level, anchor split only). Falls back to rubric-only
 * scoring when the corpus isn't built or embedding fails.
 */
export async function retrieveAnchors(db: Db | null, subject: "chi_writing" | "eng_writing", text: string, part: string, genre: string | null) {
  if (!db) return []; // local mode: no corpus, rubric-only scoring
  try {
    if (!(await hasAnchors(db, subject, part))) return [];
    return await pickLevelAnchors(db, await embedOne(text), { subject, part, genre });
  } catch (e) {
    console.warn("anchor retrieval skipped:", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * DSE estimate for Chinese 乙部 (rubrics/chinese-writing.md §5): the model grades each criterion
 * against the anchors; code applies the official caps, the 錯別字 mark and the total.
 */
export async function estimateChinese(opts: {
  db: Db | null;
  text: string;
  task: string;
  genre: string | null;
  wrongChars: { wrong: string; correct: string }[];
  onUsage: UsageSink;
}): Promise<EstimateResult> {
  const chars = textLength(opts.text, "chi_writing");
  const anchors = await retrieveAnchors(opts.db, "chi_writing", opts.text, "B", opts.genre);
  const anchorText = anchors.map((a) => `【錨點 ${anchorLabel(a)}｜第${a.level}級示例｜${a.genre ?? ""}】\n${a.text}`).join("\n\n");

  const out = await askStructured({
    purpose: "writing_estimate_chinese",
    tier: "top",
    system: chineseEstimateSystem(anchors.length > 0),
    text: `${anchorText ? `${anchorText}\n\n==========\n` : ""}【題目】\n${opts.task}\n\n【待評作文】共 ${chars} 字（標點計算在內）：\n${opts.text}`,
    schema: ChineseEstimateSchema,
    onUsage: opts.onUsage,
  });

  const idsFor = (labels: string[]) => anchors.filter((a) => labels.includes(anchorLabel(a))).map((a) => a.chunkId);
  const scores: ScoreRow[] = [];
  for (const c of Object.keys(CHINESE_CRITERIA) as ChineseCriterion[]) {
    const r = out[c];
    const { grade, capped } = applyCaps(c, r.grade, out.offTopic, chars);
    scores.push({
      criterion: c,
      grade,
      marks: gradePoints(grade) * CHINESE_CRITERIA[c].weight,
      maxMarks: 10 * CHINESE_CRITERIA[c].weight,
      reason: capped ? `${r.reason}（${capped}）` : r.reason,
      anchorIds: idsFor(r.comparedTo),
    });
  }
  const distinct = distinctWrongChars(opts.wrongChars);
  scores.push({
    criterion: "wrong_chars",
    grade: `${distinct}個`,
    marks: wrongCharMarks(distinct),
    maxMarks: 3,
    reason: `錯別字 ${distinct} 個（重錯不計）：0–1個 3分；2–4個 2分；5–7個 1分；8個或以上 0分。`,
    anchorIds: [],
  });

  const totalMarks = scores.reduce((s, r) => s + r.marks, 0);
  // The anchor-based level is trusted within one level of the (estimated) mark mapping.
  const byTotal = levelFromTotal(totalMarks);
  const level = Math.max(byTotal - 1, Math.min(byTotal + 1, out.level));
  return { part: "B", scores, totalMarks, maxMarks: CHINESE_MAX_TOTAL, level, levelReason: out.levelReason };
}
