/** Offline self-test for Physics figures, unit-aware answer checks and marking normalisation (no API calls). Run: npx tsx scripts/physics-selftest.mts */
import assert from "node:assert/strict";
import { PhysicsFigureSchema, type CircuitFigure, type RayFigure } from "../src/lib/schemas/physics-figure";
import type { QuestionContent } from "../src/lib/schemas/question";
import type { MarkingOutput } from "../src/lib/schemas/practice";
import { topicsFor } from "../src/lib/topic-tree";
import { parsePhysicsFigureJson } from "../src/server/ai/prompts/physics-rules";
import { normaliseMarking } from "../src/server/services/practice/normalise-marking";
import {
  alternativeValues,
  checkCircuit,
  checkFreeBody,
  checkPhysicsQuestion,
  checkRay,
  checkWave,
  compareStudentQuantity,
  expectedImage,
  parseQuantityText,
  solveCircuit,
} from "../src/server/services/practice/physics-check";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

// --- Sample figures (one per kind), as the model would write them (defaults omitted)
const circuitJson = {
  kind: "circuit",
  nodes: [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 6, y: 0 },
    { id: "c", x: 6, y: 4 },
    { id: "d", x: 0, y: 4 },
    { id: "p", x: 2, y: 4 },
    { id: "q", x: 4, y: 4 },
    { id: "p2", x: 2, y: 2 },
    { id: "q2", x: 4, y: 2 },
    { id: "p4", x: 2, y: 6 },
    { id: "q4", x: 4, y: 6 },
  ],
  components: [
    { type: "cell", from: "a", to: "b", label: "12 V", value: 12, internalResistance: 1 },
    { type: "ammeter", from: "b", to: "c", reading: 2 },
    { type: "resistor", from: "c", to: "q", label: "3 Ω", value: 3 },
    { type: "resistor", from: "q", to: "p", label: "R₁ = 6 Ω", value: 6 },
    { type: "wire", from: "q", to: "q2" },
    { type: "resistor", from: "q2", to: "p2", label: "R₂ = 12 Ω", value: 12 },
    { type: "wire", from: "p2", to: "p" },
    { type: "switch", from: "p", to: "d", label: "S", closed: true },
    { type: "wire", from: "d", to: "a" },
    { type: "wire", from: "p", to: "p4" },
    { type: "wire", from: "q", to: "q4" },
    { type: "voltmeter", from: "p4", to: "q4", reading: 8 },
  ],
};
const rayJson = {
  kind: "ray",
  element: { type: "convex_lens", focalLength: 10 },
  object: { x: -30, height: 4 },
  image: { x: 15, height: -2, virtual: false },
  rays: [
    { points: [{ x: -30, y: 4 }, { x: 0, y: 4 }, { x: 15, y: -2 }, { x: 25, y: -6 }] },
    { points: [{ x: -30, y: 4 }, { x: 0, y: 0 }, { x: 15, y: -2 }, { x: 25, y: -3.333 }] },
  ],
  window: { xMin: -35, xMax: 30, yMin: -8, yMax: 8 },
  gridSpacing: 5,
  scaleNote: "1 square represents 5 cm",
};
const freeBodyJson = {
  kind: "free_body",
  body: { shape: "box", label: "block" },
  surface: "incline",
  inclineAngle: 30,
  forces: [
    { label: "W = 20 N", type: "weight", angle: 270, magnitude: 20 },
    { label: "R", type: "normal", angle: 120, magnitude: 17.3205 },
    { label: "f", type: "friction", angle: 30, magnitude: 10 },
  ],
  equilibrium: true,
};
const waveJson = {
  kind: "wave",
  axis: "x",
  curve: { amplitude: 2, spacing: 0.8 },
  to: 2,
  xLabel: "x / m",
  yLabel: "y / cm",
  direction: "right",
  points: [{ at: 0.2, label: "P" }, { at: 0.6, label: "Q" }],
  speed: 4,
  frequency: 5,
};

test("schema parses one sample figure of each kind (defaults filled)", () => {
  for (const j of [circuitJson, rayJson, freeBodyJson, waveJson]) {
    const r = PhysicsFigureSchema.safeParse(j);
    assert.ok(r.success, `${j.kind}: ${r.success ? "" : r.error.message}`);
  }
  const ray = PhysicsFigureSchema.parse(rayJson) as RayFigure;
  assert.equal(ray.showFocalPoints, true);
  assert.equal(ray.object!.label, "O");
  assert.equal(ray.rays[0].arrow, true);
  const { value, problems } = parsePhysicsFigureJson(JSON.stringify(waveJson));
  assert.equal(problems.length, 0);
  assert.equal(value?.kind, "wave");
  assert.ok(parsePhysicsFigureJson('{"kind":"circuit"}').problems.length > 0);
  assert.ok(parsePhysicsFigureJson("{oops").problems[0].includes("not valid JSON"));
  assert.deepEqual(parsePhysicsFigureJson(""), { value: null, problems: [] });
});

test("topic tree has physics rows incl. electives", () => {
  const rows = topicsFor("physics");
  assert.ok(rows.length >= 30);
  assert.ok(rows.some((r) => r.id === "PHY-II-2" && r.strand === "Force and Motion"));
  assert.ok(rows.some((r) => r.id === "PHY-IX-3"));
  assert.equal(rows.find((r) => r.id === "PHY-I-4")?.extension, true);
});

// --- Circuit solver
test("circuit solver: series + parallel with internal resistance", () => {
  const c = PhysicsFigureSchema.parse(circuitJson) as CircuitFigure;
  const sol = solveCircuit(c)!;
  assert.ok(sol);
  // R_total = 1 + 3 + 4 = 8 Ω → I = 1.5 A; V across parallel = 6 V
  const ammeter = c.components.findIndex((x) => x.type === "ammeter");
  const voltmeter = c.components.findIndex((x) => x.type === "voltmeter");
  assert.ok(Math.abs(sol.readings[ammeter] - 1.5) < 1e-6, `I = ${sol.readings[ammeter]}`);
  assert.ok(Math.abs(sol.readings[voltmeter] - 6) < 1e-6, `V = ${sol.readings[voltmeter]}`);
  // The sample deliberately states wrong readings (2 A, 8 V): both flagged.
  const problems = checkCircuit(c);
  assert.equal(problems.length, 2, problems.join("\n"));
  assert.ok(problems[0].includes("solver gives 1.5"));
  const fixed = { ...c, components: c.components.map((x) => (x.type === "ammeter" ? { ...x, reading: 1.5 } : x.type === "voltmeter" ? { ...x, reading: 6 } : x)) };
  assert.deepEqual(checkCircuit(fixed), []);
  // Opening the switch: no current.
  const open = { ...fixed, components: fixed.components.map((x) => (x.type === "switch" ? { ...x, closed: false } : x)) };
  assert.ok(solveCircuit(open)!.readings[ammeter] < 1e-6);
});

test("circuit solver: ideal diodes and layout problems", () => {
  const base = (diodeFrom: string, diodeTo: string) =>
    PhysicsFigureSchema.parse({
      kind: "circuit",
      nodes: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 4, y: 0 },
        { id: "c", x: 4, y: 3 },
        { id: "d", x: 0, y: 3 },
      ],
      components: [
        { type: "cell", from: "a", to: "b", value: 6 },
        { type: "diode", from: diodeFrom, to: diodeTo },
        { type: "resistor", from: "c", to: "d", value: 3 },
        { type: "ammeter", from: "d", to: "a" },
      ],
    }) as CircuitFigure;
  assert.ok(Math.abs(solveCircuit(base("b", "c"))!.readings[3] - 2) < 1e-6, "forward-biased diode conducts");
  assert.ok(solveCircuit(base("c", "b"))!.readings[3] < 1e-6, "reverse-biased diode blocks");
  const bad = PhysicsFigureSchema.parse({
    kind: "circuit",
    nodes: [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 4, y: 0 },
      { id: "c", x: 4, y: 3 },
      { id: "m", x: 2, y: 0 },
    ],
    components: [
      { type: "cell", from: "a", to: "b", value: 6 },
      { type: "resistor", from: "a", to: "b", value: 2 },
      { type: "wire", from: "b", to: "x" },
      { type: "resistor", from: "a", to: "c", value: 2 },
    ],
  }) as CircuitFigure;
  const p = checkCircuit(bad).join("\n");
  assert.match(p, /missing node/);
  assert.match(p, /diagonal/);
  assert.match(p, /on top of each other/);
  assert.match(p, /runs through node "m"/);
});

// --- Ray diagrams
test("thin-lens / mirror formula", () => {
  const r = PhysicsFigureSchema.parse(rayJson) as RayFigure;
  assert.deepEqual(checkRay(r), []);
  const img = expectedImage(r) as { x: number; height: number; virtual: boolean };
  assert.ok(Math.abs(img.x - 15) < 1e-9 && Math.abs(img.height + 2) < 1e-9 && !img.virtual);
  // Magnifying glass: u = 6, f = 10 → v = -15 (virtual, upright, ×2.5)
  const mg = expectedImage({ ...r, object: { x: -6, height: 2, label: "O" } }) as { x: number; height: number; virtual: boolean };
  assert.ok(Math.abs(mg.x + 15) < 1e-9 && Math.abs(mg.height - 5) < 1e-9 && mg.virtual);
  // Concave lens always virtual, diminished
  const cl = expectedImage({ ...r, element: { type: "concave_lens", focalLength: 10, halfHeight: null } }) as { x: number; height: number; virtual: boolean };
  assert.ok(cl.virtual && Math.abs(cl.x + 7.5) < 1e-9 && Math.abs(cl.height - 1) < 1e-9);
  // Concave mirror, u = 30, f = 10 → real image 15 in front (x = -15), inverted
  const cm = expectedImage({ ...r, element: { type: "concave_mirror", focalLength: 10, halfHeight: null } }) as { x: number; height: number; virtual: boolean };
  assert.ok(Math.abs(cm.x + 15) < 1e-9 && Math.abs(cm.height + 2) < 1e-9 && !cm.virtual);
  // Plane mirror: image as far behind
  const pm = expectedImage({ ...r, element: { type: "plane_mirror", focalLength: null, halfHeight: null } }) as { x: number; height: number; virtual: boolean };
  assert.ok(pm.x === 30 && pm.height === 4 && pm.virtual);
  assert.equal(expectedImage({ ...r, object: { x: -10, height: 2, label: "O" } }), "infinity");
});

test("a deliberately inconsistent ray diagram is flagged", () => {
  const r = PhysicsFigureSchema.parse(rayJson) as RayFigure;
  // Image drawn at 20 cm (should be 15 cm) and rays aimed at it
  const wrong: RayFigure = {
    ...r,
    image: { x: 20, height: -2, virtual: false, label: "I" },
    rays: [{ points: [{ x: -30, y: 4 }, { x: 0, y: 4 }, { x: 20, y: -2 }], dashed: false, arrow: true }],
  };
  const p = checkRay(wrong);
  assert.ok(p.some((x) => x.includes("inconsistent with the convex lens formula") && x.includes("expected x = 15")), p.join("\n"));
  // Image right but a ray misses it
  const missed: RayFigure = { ...r, rays: [{ points: [{ x: -30, y: 4 }, { x: 0, y: 4 }, { x: 25, y: 0 }], dashed: false, arrow: true }] };
  assert.ok(checkRay(missed).some((x) => x.includes("does not pass through")));
  // Virtual image marked as real
  assert.ok(checkRay({ ...r, object: { x: -6, height: 2, label: "O" }, image: { x: -15, height: 5, virtual: false, label: "I" }, rays: [] }).some((x) => x.includes("virtual")));
  // Variables disagree with the figure
  assert.ok(checkRay(r, [{ name: "u", value: 25 }]).some((x) => x.includes("differs from u")));
});

// --- Free body and wave
test("free-body checks: balance, directions", () => {
  const fb = PhysicsFigureSchema.parse(freeBodyJson);
  assert.equal(fb.kind, "free_body");
  if (fb.kind !== "free_body") return;
  assert.deepEqual(checkFreeBody(fb), []);
  const unbalanced = { ...fb, forces: fb.forces.map((f) => (f.type === "friction" ? { ...f, magnitude: 8 } : f)) };
  assert.ok(checkFreeBody(unbalanced).some((x) => x.includes("don't balance")));
  const badNormal = { ...fb, forces: fb.forces.map((f) => (f.type === "normal" ? { ...f, angle: 90 } : f)) };
  assert.ok(checkFreeBody(badNormal).some((x) => x.includes("perpendicular")));
  const badWeight = { ...fb, equilibrium: false, forces: fb.forces.map((f) => (f.type === "weight" ? { ...f, angle: 240 } : f)) };
  assert.ok(checkFreeBody(badWeight).some((x) => x.includes("vertically down")));
});

test("wave checks: v = fλ, T = 1/f", () => {
  const wv = PhysicsFigureSchema.parse(waveJson);
  if (wv.kind !== "wave") throw new Error("kind");
  assert.deepEqual(checkWave(wv), []);
  assert.ok(checkWave({ ...wv, speed: 5 }).some((x) => x.includes("f λ")));
  assert.ok(checkWave({ ...wv, axis: "t", direction: null, frequency: 2, speed: null, curve: { ...wv.curve, spacing: 0.4 } }).some((x) => x.includes("1/f")));
  assert.ok(checkWave(wv, [{ name: "lambda", value: 1.2 }]).some((x) => x.includes("wavelength")));
  assert.ok(checkWave({ ...wv, points: [{ at: 3, label: "Z" }] }).some((x) => x.includes("outside")));
});

// --- Units
test("quantity display parsing", () => {
  const cases: [string, number, string][] = [
    ["$2.5\\ \\text{m s}^{-2}$", 2.5, "m / s^2"],
    ["$1.2 \\times 10^{3}$ J (cor. to 3 sig. fig.)", 1200, "J"],
    ["$v = 4.0$ m s$^{-1}$", 4, "m / s"],
    ["$3.0 × 10⁸$ m s⁻¹", 3e8, "m / s"],
    ["$4.2\\ \\text{k}\\Omega$", 4.2, "kohm"],
    ["$4200 \\text{ J kg}^{-1}\\text{ K}^{-1}$", 4200, "J / (kg K)"],
    ["0.25 kWh", 0.25, "kW h"],
  ];
  for (const [s, v, u] of cases) {
    const q = parseQuantityText(s);
    assert.ok(q.value !== null && Math.abs(q.value - v) < 1e-9 * Math.max(1, v), `${s} → ${q.value}`);
    assert.ok(q.unit.length > 0, `${s} unit`);
    void u;
  }
});

const content = (over: Partial<QuestionContent>): QuestionContent => ({
  stem: "A $2.0$ kg ball is dropped from a height of $150$ cm. Find (a) the loss in PE, (b) its speed just before hitting the ground.",
  materials: null,
  figure: null,
  graph: null,
  options: [],
  correctOption: null,
  distractorNotes: [],
  variables: [
    { name: "m", value: 2 },
    { name: "h", value: 150 },
    { name: "g", value: 9.81 },
  ],
  answers: [
    { part: "a", expression: "m*g*h", value: 29.43, unit: "J", display: "$29.4\\ \\text{J}$" },
    { part: "b", expression: "sqrt(2*g*h)", value: 5.4249, unit: "m/s", display: "$5.42\\ \\text{m s}^{-1}$" },
  ],
  markingScheme: [
    { part: "a", marks: 2, items: [{ type: "M", text: "$mgh$", ecf: false }, { type: "A", text: "$29.4$ J", ecf: false }] },
    { part: "b", marks: 2, items: [{ type: "M", text: "$\\frac12 mv^2 = mgh$", ecf: false }, { type: "A", text: "$5.42$ m s$^{-1}$", ecf: true }] },
  ],
  solution: ["$mgh = 2.0 \\times 9.81 \\times 1.5 = 29.4$ J"],
  taskAnalysis: "",
  tips: [],
  physicsFigure: null,
  writing: null,
  ...over,
});
const units = { m: "kg", h: "cm", g: "m/s^2" };

test("unit-aware answer check passes a correct question (cm converted to m)", () => {
  assert.deepEqual(checkPhysicsQuestion(content({}), "short", units), []);
});

test("unit-aware answer check catches wrong units and values", () => {
  const p1 = checkPhysicsQuestion(content({}), "short", { ...units, h: null });
  assert.ok(p1.some((x) => x.includes("unit")), p1.join("\n"));
  const p2 = checkPhysicsQuestion(content({ answers: [{ part: "a", expression: "m*g", value: 19.62, unit: "J", display: "$19.6$ J" }] }), "short", units);
  assert.ok(p2.some((x) => x.includes("not J")), p2.join("\n"));
  const p3 = checkPhysicsQuestion(content({ answers: [{ part: "a", expression: "m*g*h", value: 2943, unit: "J", display: "$2943$ J" }] }), "short", units);
  assert.ok(p3.some((x) => x.includes("claimed 2943")), p3.join("\n"));
  const p4 = checkPhysicsQuestion(content({ answers: [{ part: "a", expression: "m*g*h", value: 29.43, unit: "J", display: "$29.4$" }] }), "short", units);
  assert.ok(p4.some((x) => x.includes("has no unit")), p4.join("\n"));
  // kJ display of a J answer still matches (converted)
  const p5 = checkPhysicsQuestion(content({ answers: [{ part: "a", expression: "m*g*h", value: 0.02943, unit: "kJ", display: "$0.0294$ kJ" }] }), "short", units);
  assert.deepEqual(p5, []);
});

test("MC: numeric key with units, distractor notes", () => {
  const mc = content({
    stem: "A $2.0$ kg ball falls $150$ cm. What is the loss in PE?",
    answers: [{ part: "", expression: "m*g*h", value: 29.43, unit: "J", display: "$29.4$ J" }],
    markingScheme: [],
    options: [
      { label: "A", text: "$19.6$ J" },
      { label: "B", text: "$29.4$ J" },
      { label: "C", text: "$58.9$ J" },
      { label: "D", text: "$2940$ J" },
    ],
    correctOption: "B",
    distractorNotes: [
      { label: "A", misconception: "Used mg only.", tag: "stopped-at-intermediate" },
      { label: "C", misconception: "Doubled.", tag: "extra-factor" },
      { label: "D", misconception: "Used 150 m.", tag: "phy.units" },
    ],
  });
  assert.deepEqual(checkPhysicsQuestion(mc, "mc", units), []);
  assert.ok(checkPhysicsQuestion({ ...mc, correctOption: "A", distractorNotes: mc.distractorNotes.map((d) => (d.label === "A" ? { ...d, label: "B" as const } : d)) }, "mc", units).some((x) => x.includes("does not match")));
});

test("student answers: unit conversion, g = 10 alternative, missing/wrong unit", () => {
  const key = { value: 29.43, unit: "J", display: "$29.4$ J" };
  const alts = alternativeValues("m*g*h", [{ name: "m", value: 2 }, { name: "g", value: 9.81 }, { name: "h", value: 1.5 }], 29.43);
  assert.ok(alts.some((v) => Math.abs(v - 30) < 1e-9));
  assert.deepEqual(compareStudentQuantity("29.4\\text{ J}", key, alts), { value: "match", unit: "ok" });
  assert.deepEqual(compareStudentQuantity("30 J", key, alts), { value: "match", unit: "ok" });
  assert.deepEqual(compareStudentQuantity("30 J", key), { value: "mismatch", unit: "ok" });
  assert.deepEqual(compareStudentQuantity("0.0294 kJ", key), { value: "match", unit: "ok" });
  assert.deepEqual(compareStudentQuantity("29.4", key), { value: "match", unit: "missing" });
  assert.deepEqual(compareStudentQuantity("29.4 N", key), { value: "match", unit: "wrong" });
  assert.deepEqual(compareStudentQuantity("542 cm s^{-1}", { value: 5.4249, unit: "m/s", display: "$5.42$ m s$^{-1}$" }), { value: "match", unit: "ok" });
});

test("physics marking normalisation: unit penalty once, value override, keywords via AI", () => {
  const c = content({});
  const out = (a: string, b: string): MarkingOutput => ({
    errorTags: ["phy.units", "Bad Tag!"],
    parts: [
      { part: "a", marks: [{ markIndex: 0, awarded: true, reason: "ok", studentLine: 0, ecfFrom: null }, { markIndex: 1, awarded: true, reason: "ok", studentLine: 0, ecfFrom: null }], firstWrongLine: null, finalAnswerLine: 0, finalAnswerLatex: a, note: "" },
      { part: "b", marks: [{ markIndex: 0, awarded: true, reason: "ok", studentLine: 1, ecfFrom: null }, { markIndex: 1, awarded: true, reason: "ok", studentLine: 1, ecfFrom: null }], firstWrongLine: null, finalAnswerLine: 1, finalAnswerLatex: b, note: "" },
    ],
  });
  // Missing units twice: only the first A is withdrawn.
  const r1 = normaliseMarking(c, out("29.4", "5.42"), 2, "en", "physics");
  assert.equal(r1.score, 3);
  assert.deepEqual(r1.overrides, ["a#1"]);
  assert.deepEqual(r1.errorTags, ["phy.units"]);
  // Wrong value (no ecf on (a)) → A withdrawn; g = 10 answer accepted.
  const r2 = normaliseMarking(c, out("40 J", "5.48 m s^{-1}"), 2, "en", "physics");
  assert.deepEqual(r2.overrides, ["a#1"]);
  assert.equal(r2.score, 3);
  // Same output marked as maths (no subject): units are not checked
  const r3 = normaliseMarking(c, out("29.4", "5.42"), 2, "en");
  assert.equal(r3.score, 4);
});

console.log(`\n${passed} physics self-tests passed.`);
