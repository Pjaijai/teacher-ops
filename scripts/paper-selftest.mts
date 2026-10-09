/** Offline self-test for the Physics exam paper blueprint and level estimate (no API calls). Run: npm run test:paper */
import assert from "node:assert/strict";
import physicsTopics from "../syllabus/physics.json";
import { defaultPaperSpec, type PaperSpec } from "../src/lib/schemas/paper";
import { B_TARGET_MARKS, buildPhysicsBlueprint, estimateLevel, scorePaper, STRANDS } from "../src/features/papers/lib/physics-blueprint";

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const spec = (patch: Partial<PaperSpec>): PaperSpec => ({ ...defaultPaperSpec("en", true), ...patch });
const strandIndex = (s: string) => STRANDS.indexOf(s as (typeof STRANDS)[number]);
const ext = new Set(
  (physicsTopics as { id: string; extension: boolean; objectives: { id: string; textEn: string }[] }[]).flatMap((t) =>
    t.extension ? [t.id, ...t.objectives.map((o) => o.id)] : t.objectives.filter((o) => /\[EXT\]/.test(o.textEn)).map((o) => o.id),
  ),
);

// Full paper: 33 MC in strand order with the default counts, then about 84 marks of 1B ending on nuclear.
const full = buildPhysicsBlueprint(spec({ preset: "full" }), rand);
const a = full.filter((s) => s.section === "A");
const b = full.filter((s) => s.section === "B");
assert.equal(a.length, 33);
assert.ok(a.every((s) => s.kind === "mc"));
assert.deepEqual(STRANDS.map((st) => a.filter((s) => s.strand === st).length), [3, 10, 9, 8, 3]);
assert.ok(a.every((s, i) => i === 0 || strandIndex(a[i - 1].strand) <= strandIndex(s.strand)), "1A in syllabus order");
assert.ok(full.every((s) => !/^PHY-(VI|VII|VIII|IX)-/.test(s.topicIds[0])), "no electives");
const bMarks = b.reduce((t, s) => t + s.marks, 0);
assert.ok(Math.abs(bMarks - B_TARGET_MARKS) <= 4, `1B marks ${bMarks}`);
assert.equal(b.at(-1)!.strand, "V");
assert.equal(b.filter((s) => s.kind === "experiment").length, 1);
assert.ok(b.some((s) => /passage/.test(s.instructions)));
assert.deepEqual(full.map((s) => s.n), [...a.map((_, i) => i + 1), ...b.map((_, i) => i + 1)]);

// MC count: a shorter Section A keeps strand order and still covers each strand.
const short = buildPhysicsBlueprint(spec({ preset: "1A", mcCount: 10 }), rand);
assert.equal(short.length, 10);
assert.ok(short.every((s, i) => i === 0 || strandIndex(short[i - 1].strand) <= strandIndex(s.strand)));
assert.equal(new Set(short.map((s) => s.strand)).size, 5);
assert.equal(buildPhysicsBlueprint(spec({ preset: "full", mcCount: 20 }), rand).filter((s) => s.section === "A").length, 20);
assert.equal(buildPhysicsBlueprint({ ...spec({ preset: "1A" }), mcCount: undefined as unknown as number }, rand).length, 33, "old papers default to 33");

// Presets.
assert.equal(buildPhysicsBlueprint(spec({ preset: "1A" }), rand).filter((s) => s.section === "B").length, 0);
assert.equal(buildPhysicsBlueprint(spec({ preset: "1B" }), rand).filter((s) => s.section === "A").length, 0);

// Extension off: no [EXT] topics or subtopics anywhere.
const core = buildPhysicsBlueprint(spec({ extension: false }), rand);
assert.ok(core.every((s) => !ext.has(s.topicIds[0])), "extension off");

// Restricted to mechanics + electricity: still 33 MC, only those strands, in order; 1B still ~84 marks.
const mech = buildPhysicsBlueprint(spec({ topicIds: ["PHY-II-2", "PHY-IV-2"] }), rand);
const mechA = mech.filter((s) => s.section === "A");
assert.equal(mechA.length, 33);
assert.ok(mech.every((s) => s.strand === "II" || s.strand === "IV"));
assert.ok(mech.every((s) => s.topicIds[0].startsWith("PHY-II-2") || s.topicIds[0].startsWith("PHY-IV-2")));
assert.ok(mechA.every((s, i) => i === 0 || strandIndex(mechA[i - 1].strand) <= strandIndex(s.strand)));
const mechB = mech.filter((s) => s.section === "B").reduce((t, s) => t + s.marks, 0);
assert.ok(mechB >= B_TARGET_MARKS - 4, `restricted 1B marks ${mechB}`);

// Subtopic choice narrows to that subtopic.
const sub = buildPhysicsBlueprint(spec({ preset: "1A", topicIds: ["PHY-I-3.2"] }), rand);
assert.ok(sub.length === 33 && sub.every((s) => s.topicIds[0] === "PHY-I-3.2"));

// Focus and notes reach every slot's instructions.
const steered = buildPhysicsBlueprint(spec({ preset: "1B", focus: ["lens formula"], notes: "Use Hong Kong contexts." }), rand);
assert.ok(steered.every((s) => s.instructions.includes("lens formula") && s.instructions.includes("Hong Kong contexts")));

// Levels and scoring.
assert.equal(estimateLevel(90), "5**");
assert.equal(estimateLevel(85), "5**");
assert.equal(estimateLevel(84.9), "5*");
assert.equal(estimateLevel(55), "4");
assert.equal(estimateLevel(10), "U");
const r = scorePaper([
  { section: "A", strand: "I", score: 1, maxScore: 1 },
  { section: "A", strand: "II", score: 0, maxScore: 1 },
  { section: "B", strand: "II", score: 6, maxScore: 8 },
  { section: "B", strand: "V", score: null, maxScore: 6 },
]);
assert.deepEqual([r.score, r.max, r.unmarked, r.A.score, r.B.marked], [7, 10, 1, 1, 1]);
assert.equal(r.level, "5");

console.log("paper self-test: all passed");
