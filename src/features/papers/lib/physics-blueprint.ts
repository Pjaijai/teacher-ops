import physicsTopics from "../../../../syllabus/physics.json";
import { MC_DEFAULT, MC_MAX, type PaperSpec } from "@/lib/schemas/paper";

/**
 * The shape of a mock HKDSE Physics Paper 1, distilled from syllabus/physics-question-design.md §1, §2 and §5.
 * Pure: builds the slots (what each question should test); the questions themselves are generated per slot.
 */

type Topic = { id: string; strand: string; extension: boolean; objectives: { id: string; textEn: string }[] };
const TOPICS = (physicsTopics as Topic[]).filter((t) => /^PHY-(I|II|III|IV|V)-/.test(t.id));

/** Compulsory strands in syllabus order, keyed by their numeral. */
export const STRANDS = ["I", "II", "III", "IV", "V"] as const;
export type Strand = (typeof STRANDS)[number];
export const strandOfId = (id: string) => (/^PHY-(I|II|III|IV|V)-/.exec(id)?.[1] ?? null) as Strand | null;

/** Paper 1A: questions per strand (generator default 3 / 10 / 9 / 8 / 3). */
const MC_COUNTS: Record<Strand, number> = { I: 3, II: 10, III: 9, IV: 8, V: 3 };

/** Paper 1B template, in paper order: about 84 marks, nuclear last and short. */
type BTemplate = { strand: Strand; marks: number; style?: "experiment" | "passage"; gases?: true };
const B_TEMPLATE: BTemplate[] = [
  { strand: "I", marks: 8 },
  { strand: "I", marks: 7, gases: true },
  { strand: "II", marks: 10 },
  { strand: "II", marks: 8 },
  { strand: "II", marks: 10, style: "experiment" },
  { strand: "III", marks: 10, style: "passage" },
  { strand: "III", marks: 8 },
  { strand: "IV", marks: 10 },
  { strand: "IV", marks: 8 },
  { strand: "V", marks: 6 },
];
export const B_TARGET_MARKS = 84;

export type PaperSlot = {
  n: number;
  section: "A" | "B";
  strand: Strand;
  /** One subtopic id (or topic id) this question tests. */
  topicIds: string[];
  kind: "mc" | "short" | "long" | "experiment";
  difficulty: number;
  /** 1B: the mark target given to the generator. */
  marks: number;
  instructions: string;
};

const isExtObjective = (o: { textEn: string }) => /\[EXT\]/.test(o.textEn);
const clamp = (d: number) => Math.min(5, Math.max(1, Math.round(d)));

function shuffle<T>(list: T[], rand: () => number) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Choice = { id: string; ext: boolean };

/** Eligible subtopics per strand, honouring the spec's topic/subtopic choice and the extension switch. */
function pools(spec: Pick<PaperSpec, "topicIds" | "extension">) {
  const chosen = new Set(spec.topicIds);
  const restricted = chosen.size > 0;
  const out = new Map<Strand, { gases: Choice[]; other: Choice[] }>();
  for (const t of TOPICS) {
    if (t.extension && !spec.extension) continue;
    const pickedObjectives = t.objectives.filter((o) => chosen.has(o.id));
    if (restricted && !chosen.has(t.id) && pickedObjectives.length === 0) continue;
    const objectives = (pickedObjectives.length ? pickedObjectives : t.objectives).filter((o) => spec.extension || !isExtObjective(o));
    const picks = (objectives.length ? objectives.map((o) => ({ id: o.id, ext: t.extension || isExtObjective(o) })) : [{ id: t.id, ext: t.extension }]);
    const strand = strandOfId(t.id)!;
    const p = out.get(strand) ?? { gases: [], other: [] };
    (t.id === "PHY-I-4" ? p.gases : p.other).push(...picks);
    out.set(strand, p);
  }
  return out;
}

/** Shares `total` over the strands in proportion to `weights` (largest remainder). */
function share(total: number, weights: [Strand, number][]) {
  const sum = weights.reduce((s, [, w]) => s + w, 0);
  const raw = weights.map(([s, w]) => ({ s, exact: (total * w) / sum }));
  const counts = raw.map((r) => ({ s: r.s, n: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let left = total - counts.reduce((s, c) => s + c.n, 0);
  for (const c of [...counts].sort((a, b) => b.rem - a.rem)) {
    if (left-- <= 0) break;
    c.n += 1;
  }
  return new Map(counts.map((c) => [c.s, c.n]));
}

/** Round-robin over a shuffled pool, so a block covers as many different subtopics as it can. */
function taker(pool: Choice[], rand: () => number) {
  let order = shuffle(pool, rand);
  let i = 0;
  return () => {
    if (i >= order.length) {
      order = shuffle(pool, rand);
      i = 0;
    }
    return order[i++];
  };
}

function common(spec: PaperSpec, section: "A" | "B", n: number) {
  const lines = [`This is Question ${n} of a mock HKDSE Physics Paper 1${section} (Section ${section}).`];
  if (spec.focus.length) lines.push(`Paper focus — stress one of these if it fits this question's topic: ${spec.focus.join("; ")}.`);
  if (spec.notes.trim()) lines.push(spec.notes.trim());
  return lines;
}

function sectionA(spec: PaperSpec, p: ReturnType<typeof pools>, rand: () => number): PaperSlot[] {
  const active = STRANDS.filter((s) => (p.get(s)?.other.length ?? 0) + (p.get(s)?.gases.length ?? 0) > 0);
  // Papers saved before mcCount existed have no value: use the real paper's 33.
  const total = Math.min(MC_MAX, Math.max(1, spec.mcCount ?? MC_DEFAULT));
  const counts = share(total, active.map((s) => [s, MC_COUNTS[s]]));
  const slots: PaperSlot[] = [];
  for (const strand of active) {
    const k = counts.get(strand) ?? 0;
    const pool = [...p.get(strand)!.other, ...p.get(strand)!.gases];
    const next = taker(pool, rand);
    // `*` (extension) items sit at the hard end of their block.
    const picks = Array.from({ length: k }, next).sort((a, b) => Number(a.ext) - Number(b.ext));
    picks.forEach((pick, i) => {
      const pos = k > 1 ? i / (k - 1) : 0.5;
      const n = slots.length + 1;
      slots.push({
        n,
        section: "A",
        strand,
        topicIds: [pick.id],
        kind: "mc",
        difficulty: clamp(spec.difficulty - 1 + 2 * pos),
        marks: 1,
        instructions: [...common(spec, "A", n), i === 0 ? "It opens its topic block, so keep it straightforward." : ""].filter(Boolean).join("\n"),
      });
    });
  }
  return slots;
}

function sectionB(spec: PaperSpec, p: ReturnType<typeof pools>, rand: () => number): PaperSlot[] {
  const has = (s: Strand) => (p.get(s)?.other.length ?? 0) + (p.get(s)?.gases.length ?? 0) > 0;
  let plan = B_TEMPLATE.filter((t) => has(t.strand)).map((t) => {
    // Without gases available (extension off or not chosen) the second heat question stays on heat.
    if (t.gases && !(p.get("I")?.gases.length && p.get("I")?.other.length)) return { ...t, gases: undefined };
    return t;
  });
  if (plan.length === 0) return [];
  // A restricted paper still aims at about 84 marks: repeat the chosen strands' questions.
  const base = [...plan];
  for (let i = 0; plan.reduce((s, t) => s + t.marks, 0) < B_TARGET_MARKS - 4 && i < 20; i++) {
    const extra = base[i % base.length];
    plan.push({ strand: extra.strand, marks: extra.marks });
  }
  plan = STRANDS.flatMap((s) => plan.filter((t) => t.strand === s));
  if (!plan.some((t) => t.style === "experiment")) plan[Math.min(2, plan.length - 1)] = { ...plan[Math.min(2, plan.length - 1)], style: "experiment" };

  const takers = new Map<Strand, { gases: () => Choice; other: () => Choice }>();
  for (const s of STRANDS) {
    const q = p.get(s);
    if (!q) continue;
    const all = [...q.other, ...q.gases];
    takers.set(s, { gases: taker(q.gases.length ? q.gases : all, rand), other: taker(q.other.length ? q.other : all, rand) });
  }
  return plan.map((t, i) => {
    const n = i + 1;
    const pick = t.gases ? takers.get(t.strand)!.gases() : takers.get(t.strand)!.other();
    const kind = t.style === "experiment" ? "experiment" : t.marks <= 6 ? "short" : "long";
    const lines = [...common(spec, "B", n), `Aim for about ${t.marks} marks in total.`];
    if (t.style === "passage") lines.push('Make it a "Read the following passage…" question: a 100–200-word passage in a box, then 4–6 parts.');
    return {
      n,
      section: "B" as const,
      strand: t.strand,
      topicIds: [pick.id],
      kind,
      difficulty: clamp(t.strand === "V" ? spec.difficulty - 1 : spec.difficulty),
      marks: t.marks,
      instructions: lines.join("\n"),
    };
  });
}

/** The slots of a paper for this spec. `rand` is injectable for tests. */
export function buildPhysicsBlueprint(spec: PaperSpec, rand: () => number = Math.random): PaperSlot[] {
  const p = pools(spec);
  const a: PaperSlot[] = spec.preset === "1B" ? [] : sectionA(spec, p, rand);
  const b: PaperSlot[] = spec.preset === "1A" ? [] : sectionB(spec, p, rand);
  return [...a, ...b];
}

// --- Scoring ----------------------------------------------------------------------------------

/**
 * Rough percentage cut-offs for HKDSE Physics levels. NOT official: HKEAA doesn't publish fixed cut-offs and they move
 * every year. Good enough to say "around Level 4".
 */
export const DSE_LEVEL_CUTOFFS: { level: string; minPct: number }[] = [
  { level: "5**", minPct: 85 },
  { level: "5*", minPct: 76 },
  { level: "5", minPct: 67 },
  { level: "4", minPct: 54 },
  { level: "3", minPct: 41 },
  { level: "2", minPct: 28 },
  { level: "1", minPct: 16 },
];

export function estimateLevel(pct: number): string {
  return DSE_LEVEL_CUTOFFS.find((c) => pct >= c.minPct)?.level ?? "U";
}

export type SlotScore = { section: "A" | "B"; strand: Strand; score: number | null; maxScore: number };

/** Section and strand totals. Unmarked 1B questions (score null) are left out of the estimate and counted. */
export function scorePaper(slots: SlotScore[]) {
  const marked = slots.filter((s) => s.score !== null);
  const sum = (list: SlotScore[], f: (s: SlotScore) => number) => list.reduce((t, s) => t + f(s), 0);
  const section = (sec: "A" | "B") => {
    const all = slots.filter((s) => s.section === sec);
    const m = all.filter((s) => s.score !== null);
    return { score: sum(m, (s) => s.score!), max: sum(m, (s) => s.maxScore), total: all.length, marked: m.length };
  };
  const strands = STRANDS.map((strand) => {
    const m = marked.filter((s) => s.strand === strand);
    return { strand, score: sum(m, (s) => s.score!), max: sum(m, (s) => s.maxScore) };
  }).filter((s) => s.max > 0);
  const score = sum(marked, (s) => s.score!);
  const max = sum(marked, (s) => s.maxScore);
  const pct = max > 0 ? (100 * score) / max : 0;
  return {
    A: section("A"),
    B: section("B"),
    strands,
    score,
    max,
    pct,
    level: max > 0 ? estimateLevel(pct) : null,
    unmarked: slots.length - marked.length,
  };
}
