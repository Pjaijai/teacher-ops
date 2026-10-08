import { all, create, type Unit } from "mathjs";
import type { CircuitFigure, FreeBodyFigure, PhysicsFigure, RayFigure, WaveFigure } from "@/lib/schemas/physics-figure";
import type { QuestionContent, QuestionKind } from "@/lib/schemas/question";
import { closeEnough, EXPRESSION_HELPERS, latexToNumber } from "./check-answer";

/**
 * Code checks for generated Physics questions and students' final answers: unit-aware numeric checks
 * (mathjs units, compared in SI), figure consistency (circuit solver, thin-lens/mirror formula, force balance,
 * v = fλ) and the usual structural checks. Pure (no DB, no AI) so scripts/physics-selftest.mts runs offline.
 */

const math = create(all);
// Units used in HKDSE Physics that mathjs lacks. Dimensionless-ish ones (dB, %) are handled in parseUnit.
const EXTRA_UNITS: [string, string | undefined][] = [
  ["u", "1.66053906660e-27 kg"],
  ["ly", "9.4607e15 m"],
  ["AU", "1.495978707e11 m"],
  ["pc", "3.0857e16 m"],
  ["Bq", "1 Hz"],
  ["Sv", "1 J/kg"],
  ["Gy", "1 J/kg"],
  ["lm", "1 cd"],
  ["lx", "1 cd/m^2"],
  ["dioptre", "1 m^-1"],
  ["rev", "6.283185307179586 rad"],
  ["rpm", "0.10471975511965977 rad/s"],
];
for (const [name, definition] of EXTRA_UNITS) {
  try {
    math.createUnit(name, definition ? { definition } : undefined);
  } catch {
    // already defined
  }
}

// ---------------------------------------------------------------------------
// Units and quantities

const SUPERSCRIPT: Record<string, string> = { "⁻": "-", "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const DIMENSIONLESS = new Set(["", "%", "dB", "times", "sig. fig.", "s.f."]);
const ANGLE = new Set(["deg", "°", "degree", "degrees"]);

/** LaTeX-ish unit text ("m s^{-2}", "\text{kΩ}", "°C", "J kg⁻¹ K⁻¹") → a mathjs unit string. */
export function unitTextToMathjs(text: string): string {
  let s = text
    .replace(/\$/g, " ")
    .replace(/\\(?:text|mathrm|textrm|rm|operatorname|mbox)\s*\{([^{}]*)\}/g, " $1 ")
    .replace(/\\(?:,|;|!|quad|qquad|\s)/g, " ")
    .replace(/~/g, " ");
  s = s.replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^${[...m].map((c) => SUPERSCRIPT[c]).join("")}`);
  s = s.replace(/\^\s*\{\s*([-+−]?\s*\d+)\s*\}/g, (_m, n: string) => `^${n.replace(/\s|−/g, (c) => (c === "−" ? "-" : ""))}`);
  s = s.replace(/\^\s*−/g, "^-");
  s = s
    .replace(/(?:\^\s*\{?\s*\\circ\s*\}?|°|\\degree)\s*C\b/g, " degC ")
    .replace(/℃/g, " degC ")
    .replace(/\^\s*\{?\s*\\circ\s*\}?|°|\\degree/g, " deg ")
    .replace(/\\Omega|Ω/g, "ohm")
    .replace(/\b([kMGm])\s+ohm\b/g, "$1ohm")
    .replace(/\\mu\s*|μ|µ/g, "u")
    .replace(/\\cdot|·|×/g, " ")
    .replace(/\\%/g, "%")
    .replace(/\br\.p\.m\.|\brpm\b/g, "rpm")
    .replace(/\bkWh\b/g, "kW h")
    .replace(/\bD\b/g, "dioptre")
    .replace(/[{}]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** A mathjs Unit for the text, "none" for no unit / dimensionless, "angle" for degrees, or null if unknown. */
export function parseUnit(text: string | null | undefined): Unit | "none" | "angle" | null {
  const s = unitTextToMathjs(text ?? "");
  if (DIMENSIONLESS.has(s)) return "none";
  if (ANGLE.has(s)) return "angle";
  try {
    return math.unit(`1 ${s}`);
  } catch {
    return null;
  }
}

/** A variable's value with its unit (a mathjs Unit), or the plain number. °C is treated as a temperature change in K. */
export function quantity(value: number, unit: string | null | undefined): number | Unit {
  if (!unit) return value;
  const u = parseUnit(unit);
  if (u === "none" || u === "angle" || u === null) return value;
  const s = unitTextToMathjs(unit).replace(/\bdegC\b/g, "K");
  try {
    return math.unit(value, s);
  } catch {
    return math.multiply(value, math.unit(`1 ${s}`)) as Unit;
  }
}

const NUM = /[-+−]?\d+(?:\.\d+)?(?:\s*(?:\\times|×|\\cdot|x)\s*10\s*\^\s*\{?\s*[-+−]?\s*\d+\s*\}?)?/;

/**
 * Split a displayed answer ("$2.5\ \text{m s}^{-2}$", "$1.2 \times 10^{3}$ J (3 s.f.)", "v = 4.0 m s⁻¹") into its
 * number and unit text. Takes the right-hand side of the last = / ≈.
 */
export function parseQuantityText(text: string): { value: number | null; unit: string } {
  let s = text
    .replace(/\$/g, " ")
    .replace(/\\(?:left|right|displaystyle)/g, " ")
    .replace(/[−–]/g, "-")
    .replace(/\\(?:,|;|!|quad|qquad)/g, " ")
    .replace(/\\ /g, " ");
  const parts = s.split(/=|\\approx|≈|\\simeq/);
  s = parts[parts.length - 1];
  s = s.replace(/\((?:cor|corr|correct|to\b|準確|3 s|2 s|\d\s*(?:s\.?f|sig)).*$/i, " ").replace(/\b(?:cor|corr)\.\s*to.*$/i, " ");
  s = s.replace(/(\d),(?=\d{3}\b)/g, "$1");
  const sup = s.replace(/10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_m, e: string) => `10^{${[...e].map((c) => SUPERSCRIPT[c]).join("")}}`);
  if (/\\frac|\\sqrt/.test(sup)) {
    const n = latexToNumber(sup);
    if (n !== null) return { value: n, unit: "" };
  }
  const m = NUM.exec(sup);
  if (!m) {
    const n = latexToNumber(s);
    return { value: n, unit: "" };
  }
  const [mant, exp] = m[0].split(/\\times|×|\\cdot|x(?=\s*10)/);
  let value = Number(mant.replace(/\s|−/g, "").replace("−", "-"));
  if (exp) {
    const e = exp.replace(/[\s{}]/g, "").replace(/^10\^/, "");
    value *= 10 ** Number(e);
  }
  const unit = sup
    .slice(m.index + m[0].length)
    .replace(/^[\s,]+|[\s.,;]+$/g, "")
    .replace(/\(.*$/, "")
    .trim();
  return { value: Number.isFinite(value) ? value : null, unit };
}

export type PhysicsVariable = { name: string; value: number; unit: string | null };

/** Evaluate an answer expression over variables carrying units. Returns a number or a mathjs Unit. */
export function evaluateWithUnits(expression: string, variables: PhysicsVariable[]): number | Unit {
  const scope: Record<string, unknown> = { ...EXPRESSION_HELPERS };
  for (const v of variables) scope[v.name] = quantity(v.value, v.unit);
  const r = math.evaluate(expression, scope) as unknown;
  if (typeof r === "number") {
    if (!Number.isFinite(r)) throw new Error("not a real number");
    return r;
  }
  if (math.isUnit(r)) return r;
  const n = Number(r);
  if (!Number.isFinite(n)) throw new Error("not a real number");
  return n;
}

/** The numeric value of a result in the answer's unit, or an error message. */
export function valueIn(result: number | Unit, unitText: string | null): { value: number } | { error: string } {
  const target = parseUnit(unitText);
  if (typeof result === "number") {
    if (target === "none" || target === "angle" || target === null) return { value: result };
    return { error: `the expression gives a pure number but the unit is "${unitText}" (give the variables their units)` };
  }
  if (target === null) return { error: `unit "${unitText}" is not a recognised unit (use mathjs units such as m/s^2, J, ohm, kW h, MeV)` };
  if (target === "none" || target === "angle") {
    // e.g. a ratio that mathjs kept as "m / m"? mathjs simplifies those to numbers, so this is a real unit.
    return { error: `the expression has unit ${result.formatUnits()} but the answer is given without a unit` };
  }
  if (!result.equalBase(target)) return { error: `the expression has unit ${result.formatUnits() || "(none)"}, not ${unitText}` };
  return { value: result.toNumber(unitTextToMathjs(unitText ?? "").replace(/\bdegC\b/g, "K")) };
}

// ---------------------------------------------------------------------------
// Figures

const deg = (d: number) => (d * Math.PI) / 180;
const normAngle = (a: number) => ((a % 360) + 360) % 360;
const angleDiff = (a: number, b: number) => {
  const d = Math.abs(normAngle(a) - normAngle(b));
  return Math.min(d, 360 - d);
};
const near = (a: number, b: number, rel = 0.01, abs = 1e-6) => Math.abs(a - b) <= Math.max(rel * Math.max(Math.abs(a), Math.abs(b)), abs);

// --- Circuits

export type CircuitSolution = {
  /** Node voltages (relative to the first node). */
  voltages: Record<string, number>;
  /** Current through each component (index → current from `from` to `to`), for 0-Ω elements and resistors. */
  currents: Record<number, number>;
  /** Meter readings (index → |I| for ammeters, |ΔV| for voltmeters). */
  readings: Record<number, number>;
};

const RESISTIVE = new Set(["resistor", "lamp", "variable_resistor"]);
const ZERO_OHM = new Set(["wire", "ammeter", "fuse"]);

/** Solve a d.c. circuit by modified nodal analysis (ideal diodes, open capacitors). null if it can't be solved. */
export function solveCircuit(c: CircuitFigure): CircuitSolution | null {
  const nodeIdx = new Map(c.nodes.map((n, i) => [n.id, i]));
  if (c.nodes.length < 2) return null;
  for (const comp of c.components) {
    if (!nodeIdx.has(comp.from) || !nodeIdx.has(comp.to)) return null;
    if (RESISTIVE.has(comp.type) && (comp.value === null || !(comp.value > 0))) return null;
    if ((comp.type === "cell" || comp.type === "battery") && comp.value === null) return null;
  }
  if (!c.components.some((x) => (x.type === "cell" || x.type === "battery") && x.value !== null)) return null;

  const diodes = c.components.map((x, i) => (x.type === "diode" ? i : -1)).filter((i) => i >= 0);
  if (diodes.length > 6) return null;
  for (let mask = (1 << diodes.length) - 1; mask >= 0; mask--) {
    const on = new Set(diodes.filter((_, k) => mask & (1 << k)));
    const sol = solveLinear(c, nodeIdx, on);
    if (!sol) continue;
    const ok = diodes.every((i) => {
      const d = c.components[i];
      if (on.has(i)) return (sol.currents[i] ?? 0) >= -1e-9;
      return sol.voltages[d.from] - sol.voltages[d.to] <= 1e-9;
    });
    if (ok) return sol;
  }
  return null;
}

function solveLinear(c: CircuitFigure, nodeIdx: Map<string, number>, diodesOn: Set<number>): CircuitSolution | null {
  const n = c.nodes.length;
  // Voltage sources: ideal cells, 0-Ω elements, closed switches, conducting diodes.
  const vs: { comp: number; from: number; to: number; e: number }[] = [];
  const G: [number, number, number][] = [];
  const J = new Array<number>(n).fill(0);
  c.components.forEach((x, i) => {
    const a = nodeIdx.get(x.from)!, b = nodeIdx.get(x.to)!;
    if (RESISTIVE.has(x.type)) G.push([a, b, 1 / x.value!]);
    else if (x.type === "cell" || x.type === "battery") {
      const r = x.internalResistance ?? 0;
      if (r > 0) {
        G.push([a, b, 1 / r]);
        J[b] += x.value! / r;
        J[a] -= x.value! / r;
      } else vs.push({ comp: i, from: a, to: b, e: x.value! });
    } else if (ZERO_OHM.has(x.type) || (x.type === "switch" && x.closed) || (x.type === "diode" && diodesOn.has(i))) {
      vs.push({ comp: i, from: a, to: b, e: 0 });
    }
  });
  const size = n - 1 + vs.length;
  const A = Array.from({ length: size }, () => new Array<number>(size + 1).fill(0));
  const row = (node: number) => node - 1; // node 0 is ground
  for (let k = 1; k < n; k++) A[row(k)][row(k)] += 1e-9; // leak keeps floating parts solvable
  for (const [a, b, g] of G) {
    if (a > 0) A[row(a)][row(a)] += g;
    if (b > 0) A[row(b)][row(b)] += g;
    if (a > 0 && b > 0) {
      A[row(a)][row(b)] -= g;
      A[row(b)][row(a)] -= g;
    }
  }
  for (let k = 1; k < n; k++) A[row(k)][size] = J[k];
  vs.forEach((s, j) => {
    const col = n - 1 + j;
    // current i flows through the source from `from` to `to`: it leaves `from`'s node and enters `to`'s node.
    if (s.from > 0) A[row(s.from)][col] += 1;
    if (s.to > 0) A[row(s.to)][col] -= 1;
    if (s.to > 0) A[col][row(s.to)] += 1;
    if (s.from > 0) A[col][row(s.from)] -= 1;
    A[col][size] = s.e;
  });
  const x = gauss(A);
  if (!x) return null;
  const V = (node: number) => (node === 0 ? 0 : x[row(node)]);
  const voltages: Record<string, number> = {};
  c.nodes.forEach((nd, i) => (voltages[nd.id] = V(i)));
  const currents: Record<number, number> = {};
  const readings: Record<number, number> = {};
  vs.forEach((s, j) => (currents[s.comp] = x[n - 1 + j]));
  c.components.forEach((comp, i) => {
    const a = nodeIdx.get(comp.from)!, b = nodeIdx.get(comp.to)!;
    if (RESISTIVE.has(comp.type)) currents[i] = (V(a) - V(b)) / comp.value!;
    if (comp.type === "ammeter") readings[i] = Math.abs(currents[i] ?? 0);
    if (comp.type === "voltmeter") readings[i] = Math.abs(V(b) - V(a));
  });
  return { voltages, currents, readings };
}

function gauss(A: number[][]): number[] | null {
  const n = A.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-12) return null;
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      if (f === 0) continue;
      for (let k = col; k <= n; k++) A[r][k] -= f * A[col][k];
    }
  }
  return A.map((r, i) => r[n] / r[i]);
}

export function checkCircuit(c: CircuitFigure): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const nd of c.nodes) {
    if (ids.has(nd.id)) problems.push(`Circuit node "${nd.id}" is defined twice`);
    ids.add(nd.id);
  }
  const pos = new Map(c.nodes.map((n) => [n.id, n]));
  const segs: { i: number; ax: number; ay: number; bx: number; by: number }[] = [];
  c.components.forEach((x, i) => {
    const name = `${x.type}${x.label ? ` "${x.label}"` : ""}`;
    const a = pos.get(x.from), b = pos.get(x.to);
    if (!a || !b) return problems.push(`Circuit ${name} connects to a missing node (${x.from}–${x.to})`);
    if (x.from === x.to) return problems.push(`Circuit ${name} starts and ends at the same node`);
    if (Math.abs(a.x - b.x) > 1e-9 && Math.abs(a.y - b.y) > 1e-9) problems.push(`Circuit ${name} (${x.from}–${x.to}) is diagonal: add a corner node so every component is horizontal or vertical`);
    segs.push({ i, ax: a.x, ay: a.y, bx: b.x, by: b.y });
    if (RESISTIVE.has(x.type) && x.value !== null && !(x.value > 0)) problems.push(`Circuit ${name} needs a positive resistance`);
  });
  // Overlapping collinear components and components running through other nodes.
  for (let p = 0; p < segs.length; p++) {
    const s = segs[p];
    const horiz = Math.abs(s.ay - s.by) < 1e-9;
    for (const nd of c.nodes) {
      if (nd.id === c.components[s.i].from || nd.id === c.components[s.i].to) continue;
      const inside = horiz
        ? Math.abs(nd.y - s.ay) < 1e-9 && nd.x > Math.min(s.ax, s.bx) + 1e-9 && nd.x < Math.max(s.ax, s.bx) - 1e-9
        : Math.abs(nd.x - s.ax) < 1e-9 && nd.y > Math.min(s.ay, s.by) + 1e-9 && nd.y < Math.max(s.ay, s.by) - 1e-9;
      if (inside) problems.push(`Circuit ${c.components[s.i].type} ${c.components[s.i].from}–${c.components[s.i].to} runs through node "${nd.id}": split it at that node`);
    }
    for (let q = p + 1; q < segs.length; q++) {
      const t = segs[q];
      const tHoriz = Math.abs(t.ay - t.by) < 1e-9;
      if (horiz !== tHoriz) continue;
      const sameLine = horiz ? Math.abs(s.ay - t.ay) < 1e-9 : Math.abs(s.ax - t.ax) < 1e-9;
      if (!sameLine) continue;
      const [s1, s2] = horiz ? [Math.min(s.ax, s.bx), Math.max(s.ax, s.bx)] : [Math.min(s.ay, s.by), Math.max(s.ay, s.by)];
      const [t1, t2] = horiz ? [Math.min(t.ax, t.bx), Math.max(t.ax, t.bx)] : [Math.min(t.ay, t.by), Math.max(t.ay, t.by)];
      if (Math.min(s2, t2) - Math.max(s1, t1) > 1e-9) {
        problems.push(`Circuit components ${c.components[s.i].type} and ${c.components[t.i].type} are drawn on top of each other: route parallel branches through separate corner nodes`);
      }
    }
  }
  const withReading = c.components.map((x, i) => [x, i] as const).filter(([x]) => (x.type === "ammeter" || x.type === "voltmeter") && x.reading !== null);
  if (withReading.length > 0 && problems.length === 0) {
    const sol = solveCircuit(c);
    const canSolve = c.components.every((x) => !RESISTIVE.has(x.type) || x.value !== null);
    if (!sol && canSolve) problems.push("The circuit could not be solved (short circuit of an ideal cell, or no complete loop)");
    if (sol) {
      for (const [x, i] of withReading) {
        const got = sol.readings[i];
        if (!near(Math.abs(x.reading!), got, 0.01, 1e-3)) {
          problems.push(`Circuit ${x.type}${x.label ? ` "${x.label}"` : ""}: reading ${x.reading} ${x.type === "ammeter" ? "A" : "V"} does not match the circuit (solver gives ${+got.toPrecision(4)})`);
        }
      }
    }
  }
  return problems;
}

// --- Ray diagrams

/** Where the thin-lens / mirror formula (real is positive) puts the image of the figure's object. */
export function expectedImage(r: RayFigure): { x: number; height: number; virtual: boolean } | null | "infinity" {
  if (!r.object) return null;
  const t = r.element.type;
  const u = -r.object.x;
  if (!(u > 0)) return null;
  let v: number;
  if (t === "plane_mirror") v = -u;
  else {
    if (r.element.focalLength === null || !(r.element.focalLength > 0)) return null;
    const f = t === "convex_lens" || t === "concave_mirror" ? r.element.focalLength : -r.element.focalLength;
    if (Math.abs(u - f) < 1e-9 * Math.max(1, u)) return "infinity";
    v = 1 / (1 / f - 1 / u);
  }
  const isMirror = t.endsWith("mirror");
  return { x: isMirror ? -v : v, height: (-v / u) * r.object.height, virtual: v < 0 };
}

function distToLine(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy);
  if (L === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * (px - ax) - dx * (py - ay)) / L;
}

export function checkRay(r: RayFigure, variables: { name: string; value: number }[] = []): string[] {
  const problems: string[] = [];
  const w = r.window;
  if (!(w.xMin < w.xMax && w.yMin < w.yMax)) return ["Ray diagram window is empty (min ≥ max)"];
  if (!(w.xMin < 0 && w.xMax > 0)) problems.push("Ray diagram window must contain the lens/mirror at x = 0");
  const span = Math.max(w.xMax - w.xMin, w.yMax - w.yMin);
  const tol = Math.max(0.03 * span, (r.gridSpacing ?? 0) * 0.5);
  const inside = (x: number, y: number) => x >= w.xMin - tol && x <= w.xMax + tol && y >= w.yMin - tol && y <= w.yMax + tol;
  if (r.element.type !== "plane_mirror" && r.element.focalLength !== null && !(r.element.focalLength > 0)) {
    problems.push("Ray diagram focalLength must be a positive magnitude (the element type gives the sign)");
  }
  if (r.object) {
    if (!(r.object.x < 0)) problems.push("Ray diagram object must be to the LEFT of the element (x < 0)");
    if (!inside(r.object.x, r.object.height)) problems.push("Ray diagram object is outside the window");
  }
  if (r.image && !inside(r.image.x, r.image.height)) problems.push("Ray diagram image is outside the window");
  if (r.showFocalPoints && r.element.focalLength && !(r.element.focalLength < w.xMax + tol && -r.element.focalLength > w.xMin - tol)) {
    problems.push("Ray diagram window must contain both focal points");
  }

  const exp = expectedImage(r);
  if (exp === "infinity") {
    if (r.image) problems.push("The object is at the focal point, so the image is at infinity: image must be null");
  } else if (exp && r.image) {
    const tolX = Math.max(0.02 * (w.xMax - w.xMin), 0.02 * Math.abs(exp.x), (r.gridSpacing ?? 0) * 0.5);
    const tolY = Math.max(0.02 * (w.yMax - w.yMin), 0.03 * Math.abs(exp.height), (r.gridSpacing ?? 0) * 0.5);
    if (Math.abs(r.image.x - exp.x) > tolX || Math.abs(r.image.height - exp.height) > tolY || r.image.virtual !== exp.virtual) {
      problems.push(
        `Ray diagram image (x = ${r.image.x}, height = ${r.image.height}, ${r.image.virtual ? "virtual" : "real"}) is inconsistent with the ${r.element.type.replace("_", " ")} formula: expected x = ${+exp.x.toPrecision(4)}, height = ${+exp.height.toPrecision(4)}, ${exp.virtual ? "virtual" : "real"}`,
      );
    }
  }
  // Rays from the object tip must pass through (or extrapolate back to) the image tip.
  const target = r.image ? { x: r.image.x, y: r.image.height } : exp && exp !== "infinity" ? { x: exp.x, y: exp.height } : null;
  r.rays.forEach((ray, n) => {
    if (ray.points.some((p) => !inside(p.x, p.y))) problems.push(`Ray ${n + 1} goes outside the window`);
    if (!r.object || !target || ray.dashed) return;
    const p0 = ray.points[0];
    if (Math.hypot(p0.x - r.object.x, p0.y - r.object.height) > tol) return;
    const k = ray.points.findIndex((p, i) => i > 0 && Math.abs(p.x) <= tol);
    if (k < 0 || k + 1 >= ray.points.length) return;
    const a = ray.points[k], b = ray.points[k + 1];
    if (distToLine(target.x, target.y, a.x, a.y, b.x, b.y) > 0.02 * span) {
      problems.push(`Ray ${n + 1} from the object tip does not pass through (or extend back to) the image tip at (${+target.x.toPrecision(3)}, ${+target.y.toPrecision(3)})`);
    }
  });
  // Cross-check with the question's variables u and f when present.
  const vu = variables.find((v) => v.name === "u"), vf = variables.find((v) => v.name === "f");
  if (vu && r.object && !near(vu.value, -r.object.x, 0.02)) problems.push(`Ray diagram object distance ${-r.object.x} differs from u = ${vu.value} in the question`);
  if (vf && r.element.focalLength !== null && !near(vf.value, r.element.focalLength, 0.02)) problems.push(`Ray diagram focal length ${r.element.focalLength} differs from f = ${vf.value} in the question`);
  return problems;
}

// --- Free-body diagrams

export function checkFreeBody(fb: FreeBodyFigure): string[] {
  const problems: string[] = [];
  if (fb.forces.length === 0) problems.push("Free-body diagram has no forces");
  const theta = fb.surface === "incline" ? (fb.inclineAngle ?? NaN) : 0;
  if (fb.surface === "incline" && !(theta > 0 && theta < 90)) problems.push("Free-body diagram incline needs inclineAngle between 0° and 90°");
  for (const f of fb.forces) {
    if (f.magnitude !== null && !(f.magnitude >= 0)) problems.push(`Force "${f.label}" has a negative magnitude: reverse its angle instead`);
    if (f.type === "weight" && angleDiff(f.angle, 270) > 1) problems.push(`Weight "${f.label}" must point vertically down (angle 270°)`);
    if (f.type === "normal") {
      const want = fb.surface === "incline" ? 90 + theta : fb.surface === "wall" ? 0 : fb.surface === "ground" ? 90 : null;
      if (want !== null && Number.isFinite(want) && angleDiff(f.angle, want) > 1) problems.push(`Normal force "${f.label}" must be perpendicular to the surface (angle ${want}°)`);
    }
    if (f.type === "friction") {
      const along = fb.surface === "incline" ? theta : fb.surface === "wall" ? 90 : fb.surface === "ground" ? 0 : null;
      if (along !== null && Number.isFinite(along) && Math.min(angleDiff(f.angle, along), angleDiff(f.angle, along + 180)) > 1) {
        problems.push(`Friction "${f.label}" must act along the surface`);
      }
    }
  }
  if (fb.equilibrium && fb.forces.length > 0 && fb.forces.every((f) => f.magnitude !== null)) {
    const fx = fb.forces.reduce((s, f) => s + f.magnitude! * Math.cos(deg(f.angle)), 0);
    const fy = fb.forces.reduce((s, f) => s + f.magnitude! * Math.sin(deg(f.angle)), 0);
    const max = Math.max(...fb.forces.map((f) => f.magnitude!));
    if (Math.hypot(fx, fy) > 0.02 * max + 1e-6) {
      problems.push(`Free-body diagram says equilibrium but the forces don't balance (net Fx = ${+fx.toPrecision(3)} N, Fy = ${+fy.toPrecision(3)} N)`);
    }
  }
  return problems;
}

// --- Wave graphs

export function checkWave(wv: WaveFigure, variables: { name: string; value: number }[] = []): string[] {
  const problems: string[] = [];
  const curves = [wv.curve, ...(wv.second ? [wv.second] : [])];
  for (const c of curves) {
    if (!(c.amplitude > 0)) problems.push("Wave amplitude must be positive");
    if (!(c.spacing > 0)) problems.push(`Wave ${wv.axis === "x" ? "wavelength" : "period"} must be positive`);
  }
  if (!(wv.to > wv.from)) problems.push("Wave graph axis is empty (to ≤ from)");
  else if (wv.curve.spacing > 0 && (wv.to - wv.from) / wv.curve.spacing > 10) problems.push("Wave graph shows more than 10 cycles: shorten the axis");
  for (const p of wv.points) if (p.at < wv.from - 1e-9 || p.at > wv.to + 1e-9) problems.push(`Marked point "${p.label}" is outside the axis range`);
  if (wv.mode !== "single" && wv.mode !== "stationary" && !wv.second) problems.push("Superposition needs a second wave");
  if (wv.direction && wv.axis === "t") problems.push("A direction of travel only applies to displacement–distance (axis x) graphs");
  if (wv.axis === "x" && wv.speed !== null && wv.frequency !== null && !near(wv.speed, wv.frequency * wv.curve.spacing, 0.01)) {
    problems.push(`Wave graph: v = ${wv.speed} but f λ = ${wv.frequency} × ${wv.curve.spacing} = ${+(wv.frequency * wv.curve.spacing).toPrecision(4)}`);
  }
  if (wv.axis === "t" && wv.frequency !== null && !near(wv.curve.spacing, 1 / wv.frequency, 0.01)) {
    problems.push(`Wave graph: period ${wv.curve.spacing} but 1/f = ${+(1 / wv.frequency).toPrecision(4)}`);
  }
  const lam = variables.find((v) => v.name === "lambda" || v.name === "wavelength");
  if (lam && wv.axis === "x" && !near(lam.value, wv.curve.spacing, 0.02)) problems.push(`Wave graph wavelength ${wv.curve.spacing} differs from ${lam.name} = ${lam.value} in the question`);
  return problems;
}

/** Everything wrong with a physics figure (empty = consistent). */
export function checkPhysicsFigure(fig: PhysicsFigure, variables: { name: string; value: number }[] = []): string[] {
  const labels: (string | null)[] = [];
  let problems: string[] = [];
  switch (fig.kind) {
    case "circuit":
      problems = checkCircuit(fig);
      labels.push(...fig.components.map((c) => c.label), ...fig.nodes.map((n) => n.label));
      break;
    case "ray":
      problems = checkRay(fig, variables);
      labels.push(fig.object?.label ?? null, fig.image?.label ?? null, fig.scaleNote);
      break;
    case "free_body":
      problems = checkFreeBody(fig);
      labels.push(fig.body.label, ...fig.forces.map((f) => f.label));
      break;
    case "wave":
      problems = checkWave(fig, variables);
      labels.push(fig.xLabel, fig.yLabel, ...fig.points.map((p) => p.label));
      break;
  }
  if (labels.some((l) => l && /\$|\\[a-zA-Z]/.test(l))) problems.push("Figure labels are plain text: no $ or LaTeX (write R₁, 4 Ω, θ, F′)");
  return problems;
}

// ---------------------------------------------------------------------------
// Whole question

const LABELS = ["A", "B", "C", "D"] as const;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function dollarsBalanced(text: string) {
  return (text.replace(/\\\$/g, "").match(/\$/g) ?? []).length % 2 === 0;
}

/** Is a display consistent with a value in the answer's unit? Converts when the display uses another unit. */
export function compareQuantityDisplay(display: string, value: number, unit: string | null): "match" | "mismatch" | "unknown" {
  const q = parseQuantityText(display);
  if (q.value === null) return "unknown";
  let expected = value;
  const shown = parseUnit(q.unit), key = parseUnit(unit);
  if (shown && key && typeof shown === "object" && typeof key === "object" && shown.equalBase(key)) {
    expected = math.unit(value, unitTextToMathjs(unit!)).toNumber(unitTextToMathjs(q.unit));
  }
  const decimals = (/\.(\d+)/.exec(display.replace(/\\times.*$|×.*$/, ""))?.[1].length ?? 0);
  return closeEnough(q.value, expected, decimals) || near(q.value, expected, 0.006) ? "match" : "mismatch";
}

/**
 * Everything wrong with a generated physics question. `variableUnits` are the mathjs units of the variables
 * (they're dropped from the stored content after the check).
 */
export function checkPhysicsQuestion(c: QuestionContent, kind: QuestionKind, variableUnits: Record<string, string | null> = {}): string[] {
  const problems: string[] = [];
  if (!c.stem.trim()) problems.push("The stem is empty");
  const texts: [string, string][] = [
    ["stem", c.stem],
    ...c.options.map((o) => [`option ${o.label}`, o.text] as [string, string]),
    ...c.solution.map((s, i) => [`solution line ${i + 1}`, s] as [string, string]),
    ...c.markingScheme.flatMap((p) => p.items.map((it, i) => [`marking scheme (${p.part || "whole"}) item ${i + 1}`, it.text] as [string, string])),
    ...c.answers.map((a) => [`answer display (${a.part || "whole"})`, a.display] as [string, string]),
  ];
  for (const [where, t] of texts) if (!dollarsBalanced(t)) problems.push(`Unbalanced $ in ${where}: LaTeX must be wrapped in $…$`);

  const names = new Set<string>();
  for (const v of c.variables) {
    if (!IDENT.test(v.name)) problems.push(`Variable name "${v.name}" is not a simple identifier`);
    if (names.has(v.name)) problems.push(`Variable "${v.name}" is defined twice`);
    names.add(v.name);
    const u = variableUnits[v.name];
    if (u && parseUnit(u) === null) problems.push(`Variable "${v.name}": unit "${u}" is not a recognised mathjs unit`);
  }
  const vars: PhysicsVariable[] = c.variables.map((v) => ({ ...v, unit: variableUnits[v.name] ?? null }));

  for (const a of c.answers) {
    const label = a.part ? `Answer (${a.part})` : "Answer";
    let result: number | Unit;
    try {
      result = evaluateWithUnits(a.expression, vars);
    } catch (e) {
      problems.push(`${label}: expression "${a.expression}" could not be evaluated (${(e as Error).message})`);
      continue;
    }
    const v = valueIn(result, a.unit);
    if ("error" in v) {
      problems.push(`${label}: ${v.error}`);
      continue;
    }
    if (!closeEnough(a.value, v.value)) problems.push(`${label}: claimed ${a.value} ${a.unit ?? ""} but ${a.expression} = ${+v.value.toPrecision(6)} ${a.unit ?? ""}`.trim());
    if (compareQuantityDisplay(a.display, v.value, a.unit) === "mismatch") problems.push(`${label}: displayed answer "${a.display}" does not match the computed value ${+v.value.toPrecision(4)} ${a.unit ?? ""}`.trim());
    const key = parseUnit(a.unit);
    if (key && typeof key === "object" && !parseQuantityText(a.display).unit) problems.push(`${label}: displayed answer "${a.display}" has no unit (A marks need the unit)`);
  }

  if (kind === "mc") {
    if (c.options.length !== 4) problems.push(`MC question has ${c.options.length} options instead of 4`);
    if (c.options.some((o, i) => o.label !== LABELS[i])) problems.push("MC options must be labelled A, B, C, D in order");
    const optTexts = c.options.map((o) => o.text.replace(/\s+/g, ""));
    if (new Set(optTexts).size !== optTexts.length) problems.push("Two MC options are identical");
    const correct = c.options.find((o) => o.label === c.correctOption);
    if (!correct) problems.push("MC question has no valid correct option");
    else {
      const last = c.answers[c.answers.length - 1];
      if (last) {
        const r = compareQuantityDisplay(correct.text, last.value, last.unit);
        if (r === "mismatch") problems.push(`Correct option ${correct.label} ("${correct.text}") does not match the answer ${last.value} ${last.unit ?? ""}`.trim());
        if (r === "match") {
          for (const o of c.options) {
            if (o.label !== correct.label && compareQuantityDisplay(o.text, last.value, last.unit) === "match") problems.push(`Option ${o.label} ("${o.text}") has the same value as the correct option`);
          }
        }
      }
      const noted = new Set(c.distractorNotes.map((d) => d.label));
      for (const l of LABELS) if (l !== c.correctOption && !noted.has(l)) problems.push(`Distractor ${l} has no misconception note`);
      if (noted.has(c.correctOption!)) problems.push("The correct option must not have a distractor note");
      for (const d of c.distractorNotes) if (!/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/.test(d.tag)) problems.push(`Distractor tag "${d.tag}" is not kebab-case`);
    }
  } else {
    if (c.options.length > 0 || c.correctOption) problems.push("Only MC questions have options");
    if (c.markingScheme.length === 0) problems.push("Written questions need a marking scheme");
    for (const p of c.markingScheme) {
      if (p.items.length === 0) problems.push(`Marking scheme part "${p.part}" has no marks`);
      if (p.marks !== p.items.length) problems.push(`Marking scheme part "${p.part}" says ${p.marks} marks but lists ${p.items.length} items (one item per mark)`);
    }
    const parts = new Set(c.markingScheme.map((p) => p.part));
    for (const a of c.answers) if (!parts.has(a.part)) problems.push(`Answer part "${a.part}" is not in the marking scheme`);
  }

  if (c.physicsFigure) problems.push(...checkPhysicsFigure(c.physicsFigure, c.variables));
  if (c.figure) problems.push("Physics questions use the physics figure (figureJson), not the geometry figure");
  return problems;
}

// ---------------------------------------------------------------------------
// Student answers

export type StudentQuantityCheck = { value: "match" | "mismatch" | "unknown"; unit: "ok" | "missing" | "wrong" | "unknown" };

/**
 * Accepted alternative values for an answer: the key plus the value with g = 10 (or 9.81) when the answer
 * uses a variable g. The ratio is taken from plain-number evaluation, so it doesn't need the units.
 */
export function alternativeValues(expression: string, variables: { name: string; value: number }[], value: number): number[] {
  const g = variables.find((v) => v.name === "g");
  if (!g || !(g.value > 9.7 && g.value < 10.1)) return [value];
  const scope = (gv: number) => {
    const s: Record<string, unknown> = { ...EXPRESSION_HELPERS };
    for (const v of variables) s[v.name] = v.name === "g" ? gv : v.value;
    return s;
  };
  try {
    const base = Number(math.evaluate(expression, scope(g.value)));
    const out = [value];
    for (const alt of [9.81, 9.8, 10]) {
      if (Math.abs(alt - g.value) < 1e-9) continue;
      const r = Number(math.evaluate(expression, scope(alt))) / base;
      if (Number.isFinite(r) && r > 0) out.push(value * r);
    }
    return out;
  } catch {
    return [value];
  }
}

/** Compare a student's final answer (LaTeX, with unit) with the key, converting units (250 cm = 2.5 m). */
export function compareStudentQuantity(studentLatex: string, key: { value: number; unit: string | null; display: string }, alternatives: number[] = []): StudentQuantityCheck {
  const q = parseQuantityText(studentLatex);
  if (q.value === null) return { value: "unknown", unit: "unknown" };
  const keyUnit = parseUnit(key.unit ?? parseQuantityText(key.display).unit);
  const shownUnit = q.unit ? parseUnit(q.unit) : "none";
  let n = q.value;
  let unit: StudentQuantityCheck["unit"] = "unknown";
  if (keyUnit === "none" || keyUnit === "angle") unit = "ok";
  else if (keyUnit && typeof keyUnit === "object") {
    if (shownUnit === "none" || !q.unit) unit = "missing";
    else if (shownUnit && typeof shownUnit === "object") {
      if (!shownUnit.equalBase(keyUnit)) unit = "wrong";
      else {
        unit = "ok";
        n = math.unit(q.value, unitTextToMathjs(q.unit)).toNumber(unitTextToMathjs(key.unit ?? parseQuantityText(key.display).unit));
      }
    }
  }
  const values = [key.value, ...alternatives];
  const decimals = (/\.(\d+)/.exec(studentLatex)?.[1].length ?? 0);
  const ok = values.some((v) => closeEnough(n, v, decimals) || near(n, v, 0.015));
  if (ok) return { value: "match", unit };
  // A unit slip that is only a prefix (cm for m) leaves the number off by a power of ten: that is a wrong unit, not a wrong value.
  return { value: "mismatch", unit };
}
