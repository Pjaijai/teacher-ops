"use client";

import type { Subject } from "@/lib/subjects";
import { localDb, nowIso, type StatRow, type TagRow } from "./local-db";

/**
 * The learner profile, kept in the browser (same rules as the server's update-profile.ts):
 * criterion scores and topic mastery are EWMAs (α = 0.35, so the last ~5 results dominate);
 * error tags decay ×0.8 on each new result in the subject, then add this result's occurrences.
 */
const EWMA_ALPHA = 0.35;
const TAG_DECAY = 0.8;
const ewma = (prev: number | null, value: number) => (prev == null ? value : EWMA_ALPHA * value + (1 - EWMA_ALPHA) * prev);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

async function updateStat(key: string, subject: Subject, value: number) {
  const db = await localDb();
  const old = await db.get("stats", key);
  const row: StatRow = { key, subject, ewma: ewma(old?.ewma ?? null, clamp01(value)), attempts: (old?.attempts ?? 0) + 1, lastAt: nowIso() };
  await db.put("stats", row);
}

async function updateTags(subject: Subject, tags: string[]) {
  const db = await localDb();
  const all = (await db.getAll("tags")).filter((t) => t.subject === subject);
  for (const t of all) await db.put("tags", { ...t, weighted: t.weighted * TAG_DECAY });
  const counts = new Map<string, number>();
  for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [tag, n] of counts) {
    const key = `${subject}:${tag}`;
    const old = await db.get("tags", key);
    const row: TagRow = { key, subject, tag, weighted: (old ? old.weighted * TAG_DECAY : 0) + n, total: (old?.total ?? 0) + n, lastAt: nowIso() };
    await db.put("tags", row);
  }
}

export async function recordWritingResult(r: { subject: Subject; part: string; criterionScores: Record<string, number>; errorTags: string[] }) {
  for (const [criterion, v] of Object.entries(r.criterionScores)) await updateStat(`${r.subject}:${r.part}:${criterion}`, r.subject, v);
  await updateTags(r.subject, r.errorTags);
}

export async function recordAttemptResult(r: { subject: Subject; topicIds: string[]; fraction: number; errorTags: string[] }) {
  for (const topicId of new Set(r.topicIds)) await updateStat(`topic:${topicId}`, r.subject, r.fraction);
  await updateTags(r.subject, r.errorTags);
}

/** Everything the dashboard needs for one subject. */
export async function learnerSnapshot(subject: Subject) {
  const db = await localDb();
  const stats = (await db.getAll("stats")).filter((s) => s.subject === subject);
  const tags = (await db.getAll("tags")).filter((t) => t.subject === subject).sort((a, b) => b.weighted - a.weighted);
  return {
    criterionStats: stats
      .filter((s) => !s.key.startsWith("topic:"))
      .map((s) => {
        const [, part, criterion] = s.key.split(":");
        return { part, criterion, ewma: s.ewma, attempts: s.attempts, lastAt: s.lastAt };
      }),
    topicMastery: stats.filter((s) => s.key.startsWith("topic:")).map((s) => ({ topicId: s.key.slice(6), ewma: s.ewma, attempts: s.attempts, lastAt: s.lastAt })),
    errorTags: tags.slice(0, 10).map((t) => ({ tag: t.tag, weighted: t.weighted, total: t.total, lastAt: t.lastAt })),
  };
}
