import { all, create } from "mathjs";
import { checkDiagram } from "@/lib/diagram/check-diagram";
import type { Graph } from "@/lib/schemas/diagram";
import type { QuestionContent, QuestionKind, SymbolicCheck } from "@/lib/schemas/question";

/**
 * Code checks for generated maths questions and for students' final answers.
 * Pure (no DB, no AI) so scripts/check-selftest.mts can run it offline.
 */

const math = create(all);
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

// ---------------------------------------------------------------------------
// Statistics helpers (M1). The paper only prints the standard normal table, so binomial/Poisson values are computed.

const factorialN = (n: number) => Number(math.factorial(n));

function assertCount(k: number, what: string) {
  if (!Number.isInteger(k) || k < 0) throw new Error(`${what} must be a non-negative integer`);
}

/** P(X = k) for X ~ B(n, p). */
export function binomPmf(n: number, p: number, k: number) {
  assertCount(n, "n");
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  return Number(math.combinations(n, k)) * p ** k * (1 - p) ** (n - k);
}
/** P(X ≤ k) for X ~ B(n, p). */
export function binomCdf(n: number, p: number, k: number) {
  let sum = 0;
  for (let i = 0; i <= Math.min(Math.floor(k), n); i++) sum += binomPmf(n, p, i);
  return sum;
}
/** P(X = k) for X ~ Po(λ). */
export function poissonPmf(lambda: number, k: number) {
  if (!Number.isInteger(k) || k < 0) return 0;
  return (Math.exp(-lambda) * lambda ** k) / factorialN(k);
}
/** P(X ≤ k) for X ~ Po(λ). */
export function poissonCdf(lambda: number, k: number) {
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) sum += poissonPmf(lambda, i);
  return sum;
}
/** P(X ≤ x) for X ~ N(μ, σ²); normCdf(z) is the standard normal Φ(z). */
export function normCdf(x: number, mu = 0, sigma = 1) {
  return 0.5 * (1 + Number(math.erf((x - mu) / (sigma * Math.SQRT2))));
}
/** A(z) = P(0 ≤ Z ≤ z), the quantity printed in the HKDSE standard normal table (negative z by symmetry). */
export const normA = (z: number) => normCdf(z) - 0.5;
/** A(z) as read from the printed table: z rounded to 2 d.p., area rounded to 4 d.p. */
export const tableA = (z: number) => Math.sign(z) * Math.round(normA(Math.round(Math.abs(z) * 100) / 100) * 1e4) / 1e4;

/** z with Φ(z) = p (Acklam's rational approximation, polished by Newton steps); invNorm(p, μ, σ) = μ + σz. */
export function invNorm(p: number, mu = 0, sigma = 1) {
  if (!(p > 0 && p < 1)) throw new Error("invNorm needs 0 < p < 1");
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  let z: number;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else {
    const q = p - 0.5;
    const r = q * q;
    z = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  for (let i = 0; i < 3; i++) z -= (normCdf(z) - p) / (Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI));
  return mu + sigma * z;
}

/** Functions available to answer expressions besides mathjs built-ins (sqrt, log, exp, nthRoot, combinations, …). */
export const EXPRESSION_HELPERS = {
  sind: (d: number) => Math.sin(toRad(d)),
  cosd: (d: number) => Math.cos(toRad(d)),
  tand: (d: number) => Math.tan(toRad(d)),
  asind: (x: number) => toDeg(Math.asin(x)),
  acosd: (x: number) => toDeg(Math.acos(x)),
  atand: (x: number) => toDeg(Math.atan(x)),
  nCr: (n: number, r: number) => Number(math.combinations(n, r)),
  nPr: (n: number, r: number) => Number(math.permutations(n, r)),
  ln: (x: unknown) => math.log(x as number),
  arcsin: (x: unknown) => math.asin(x as number),
  arccos: (x: unknown) => math.acos(x as number),
  arctan: (x: unknown) => math.atan(x as number),
  binomPmf,
  binomCdf,
  poissonPmf,
  poissonCdf,
  normCdf,
  normA,
  tableA,
  invNorm,
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Evaluate a mathjs expression over the question's named variables. Throws on failure. */
export function evaluateExpression(expression: string, variables: { name: string; value: number }[]): number {
  const scope: Record<string, unknown> = { ...EXPRESSION_HELPERS };
  for (const v of variables) scope[v.name] = v.value;
  const result = math.evaluate(expression, scope);
  const n = typeof result === "number" ? result : Number(result);
  if (!Number.isFinite(n)) throw new Error("not a real number");
  return n;
}

// ---------------------------------------------------------------------------
// LaTeX → number

/** Replace `\cmd{a}{b}` style groups. Returns [inner text, end index] for the brace group starting at `i`. */
function braceGroup(s: string, i: number): [string, number] | null {
  if (s[i] !== "{") return null;
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return null;
}

function replaceFracs(s: string): string {
  for (let guard = 0; guard < 50; guard++) {
    const m = /\\[dt]?frac\s*/.exec(s);
    if (!m) break;
    const start = m.index;
    let i = start + m[0].length;
    // \frac12 shorthand
    const a: [string, number] | null = braceGroup(s, i) ?? (/\d/.test(s[i] ?? "") ? [s[i], i + 1] : null);
    if (!a) return s;
    i = a[1];
    while (s[i] === " ") i++;
    const b: [string, number] | null = braceGroup(s, i) ?? (/\d/.test(s[i] ?? "") ? [s[i], i + 1] : null);
    if (!b) return s;
    s = `${s.slice(0, start)}((${a[0]})/(${b[0]}))${s.slice(b[1])}`;
  }
  return s;
}

function replaceSqrts(s: string): string {
  for (let guard = 0; guard < 50; guard++) {
    const m = /\\sqrt\s*/.exec(s);
    if (!m) break;
    const start = m.index;
    let i = start + m[0].length;
    let n: string | null = null;
    if (s[i] === "[") {
      const close = s.indexOf("]", i);
      if (close < 0) return s;
      n = s.slice(i + 1, close);
      i = close + 1;
    }
    const g = braceGroup(s, i) ?? (/[\d.]/.test(s[i] ?? "") ? ([s.slice(i).match(/^[\d.]+/)![0], i + s.slice(i).match(/^[\d.]+/)![0].length] as [string, number]) : null);
    if (!g) return s;
    s = `${s.slice(0, start)}${n ? `nthRoot((${g[0]}),(${n}))` : `sqrt(${g[0]})`}${s.slice(g[1])}`;
  }
  return s;
}

const UNIT_WORDS = /\b(?:mm|cm|km|m|kg|g|mg|ml|mL|L|s|min|h|hours?|days?|years?|units?|sq|dollars?|marks?|students?|people|persons?|degrees?|rad)\b(?:\^?\(?[23]\)?)?/g;

/**
 * Turn the numeric part of a LaTeX answer ("$2\sqrt{3}$ cm", "x = \frac{7}{2}", "1\,234.5") into a mathjs
 * expression with no free variables, or null. Takes the right-hand side of the last = / ≈.
 */
export function latexToExpression(latex: string): string | null {
  let s = latex.replace(/\$/g, " ");
  s = s.replace(/\\(?:text|mathrm|textrm|operatorname|mbox)\s*\{[^{}]*\}(?:\s*\^\s*\{?\s*[23]\s*\}?)?/g, " ");
  s = s.replace(/\\(?:left|right|displaystyle|,|;|!|quad|qquad)/g, " ").replace(/\\ /g, " ");
  s = s.replace(/\^\s*\{?\s*\\circ\s*\}?|°|\\degree/g, " ");
  s = s.replace(/\\%|%/g, " ");
  const parts = s.split(/=|\\approx|≈|\\equiv/);
  s = parts[parts.length - 1];
  s = s.replace(/\(\s*(?:cor(?:rect)?\.?|corr\.?|to\b|準確).*$/i, " "); // "(cor. to 3 sig. fig.)"
  s = s.replace(/(\d),(?=\d{3}\b)/g, "$1"); // thousands separators
  s = s.replace(/(\d)\s+(?=\d{3}\b)/g, "$1"); // 1 234 (thin-space groups)
  s = replaceFracs(s);
  s = replaceSqrts(s);
  s = s
    .replace(/\\pi\b|π/g, " pi ")
    .replace(/\\times|×|\\cdot|·/g, "*")
    .replace(/\\div|÷/g, "/")
    .replace(/−/g, "-")
    .replace(/√\s*\(?([\d.]+)\)?/g, "sqrt($1)")
    .replace(/\\log_\{?(\d+)\}?\s*\(?([\d.]+)\)?/g, "log($2,$1)")
    .replace(/\\log\b/g, "log10")
    .replace(/\\ln\b/g, "log")
    .replace(/\\(?:sin|cos|tan)\b/g, (m) => `${m.slice(1)}d`)
    .replace(/\{/g, "(")
    .replace(/\}/g, ")");
  s = s.replace(UNIT_WORDS, " ").trim();
  s = s.replace(/[.,;:]+$/, "").trim();
  if (!s || /\\/.test(s)) return null;
  // Any letters left must be known functions/constants.
  const words = s.match(/[A-Za-z_]+/g) ?? [];
  const known = new Set(["pi", "sqrt", "nthRoot", "log", "log10", "e", "sind", "cosd", "tand"]);
  if (words.some((w) => !known.has(w))) return null;
  return s;
}

/** The number a LaTeX answer denotes, or null if it isn't a plain numeric value. */
export function latexToNumber(latex: string): number | null {
  const expr = latexToExpression(latex);
  if (!expr) return null;
  try {
    const n = evaluateExpression(expr, []);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Math segments of a display string ("$13$ cm" → ["13"]); the whole string if it has no $…$. */
function mathSegments(text: string): string[] {
  const segs = [...text.matchAll(/\$\$?([^$]+)\$\$?/g)].map((m) => m[1]);
  return segs.length ? segs : [text];
}

/** Decimal places of the last number literal in a string (for rounding tolerance). */
function decimalsShown(text: string): number {
  const nums = text.match(/\d+(?:\.\d+)?/g);
  if (!nums) return 0;
  const last = nums[nums.length - 1];
  const dot = last.indexOf(".");
  return dot < 0 ? 0 : last.length - dot - 1;
}

/** Is `shown` (a rounded display of some value) consistent with `exact`? Allows 3 s.f. and stated d.p. rounding. */
export function closeEnough(shown: number, exact: number, decimals = 6) {
  const tol = Math.max(Math.abs(exact) * 0.0051, 0.5 * 10 ** -decimals + 1e-9);
  return Math.abs(shown - exact) <= tol;
}

/** Compare a display string with a value. "match" | "mismatch" | "unknown" (not numeric). */
export function compareDisplay(display: string, value: number): "match" | "mismatch" | "unknown" {
  let sawNumber = false;
  for (const seg of mathSegments(display)) {
    const n = latexToNumber(seg);
    if (n === null) continue;
    sawNumber = true;
    if (closeEnough(n, value, decimalsShown(seg))) return "match";
  }
  return sawNumber ? "mismatch" : "unknown";
}

// ---------------------------------------------------------------------------
// Symbolic answers (M1/M2): random-point evaluation

export type SymbolicResult = { part: string; kind: SymbolicCheck["kind"]; ok: boolean; detail: string };

type Real = (x: number) => number;
type Cplx = { re: number; im: number };

const TARGET_POINTS = 20;
const MIN_POINTS = 8;

/** Deterministic PRNG so a check gives the same verdict every run. */
function rng(seedText: string) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toReal(v: unknown): number {
  if (typeof v === "number") return v;
  if (math.typeOf(v) === "Complex") {
    const c = v as Cplx;
    return Math.abs(c.im) <= 1e-12 * Math.max(1, Math.abs(c.re)) ? c.re : NaN;
  }
  if (math.typeOf(v) === "Fraction" || math.typeOf(v) === "BigNumber") return Number(v);
  return NaN;
}

/** Compile `expr` as a function of `variable`, with the question's named constants and the helpers in scope. */
function compileIn(expr: string, variable: string, variables: { name: string; value: number }[]) {
  const code = math.compile(expr);
  const scope: Record<string, unknown> = { ...EXPRESSION_HELPERS, C: 0 };
  for (const v of variables) scope[v.name] = v.value;
  const real: Real = (x) => {
    try {
      scope[variable] = x;
      const y = toReal(code.evaluate(scope));
      return Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
  const complex = (z: Cplx): Cplx | null => {
    try {
      scope[variable] = math.complex(z.re, z.im);
      const r = code.evaluate(scope);
      const c = typeof r === "number" ? { re: r, im: 0 } : math.typeOf(r) === "Complex" ? (r as Cplx) : null;
      return c && Number.isFinite(c.re) && Number.isFinite(c.im) ? c : null;
    } catch {
      return null;
    }
  };
  return { real, complex };
}

const near = (a: number, b: number, rel: number) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));
const fmt = (n: number) => (Number.isFinite(n) ? Number(n.toPrecision(8)).toString() : String(n));

/** Random sample points in the domain; integers instead when the expression only makes sense there (nCr, factorial). */
function samplePoints(domain: [number, number], seed: string, valid: (x: number) => boolean) {
  const [a, b] = domain[0] <= domain[1] ? domain : [domain[1], domain[0]];
  const next = rng(seed);
  const pts: number[] = [];
  for (let tries = 0; tries < 200 && pts.length < TARGET_POINTS; tries++) {
    const x = a + (b - a) * (0.02 + 0.96 * next());
    if (valid(x)) pts.push(x);
  }
  if (pts.length >= MIN_POINTS) return pts;
  const ints: number[] = [];
  for (let n = Math.ceil(a); n <= Math.floor(b) && ints.length < TARGET_POINTS; n++) if (valid(n)) ints.push(n);
  return ints.length > pts.length ? ints : pts;
}

/** Five-point central difference at two step sizes (the second guards against curvature near poles). */
function derivatives(f: Real, x: number): number[] {
  const out: number[] = [];
  for (const k of [1e-3, 2.5e-4]) {
    const h = k * Math.max(1, Math.abs(x));
    const d = (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
    if (Number.isFinite(d)) out.push(d);
  }
  return out;
}

/** `g` should be the derivative of `f`: compare g with finite differences of f at random points. */
function derivativeAgreement(f: Real, g: Real, domain: [number, number], seed: string, what: string): { ok: boolean; detail: string } {
  const pts = samplePoints(domain, seed, (x) => Number.isFinite(g(x)) && derivatives(f, x).length > 0);
  if (pts.length < MIN_POINTS) return { ok: false, detail: `only ${pts.length} points in [${domain.join(", ")}] where both sides are defined; choose a domain inside the function's domain` };
  const bad: string[] = [];
  for (const x of pts) {
    const want = g(x);
    const ds = derivatives(f, x);
    if (!ds.some((d) => near(d, want, 1e-5))) bad.push(`at x = ${fmt(x)}: ${what} ${fmt(want)} but numerically ${fmt(ds[ds.length - 1])}`);
  }
  const ok = bad.length === 0 || (bad.length === 1 && pts.length >= 15);
  return { ok, detail: ok ? `agrees at ${pts.length - bad.length}/${pts.length} random points` : bad.slice(0, 2).join("; ") };
}

/** Adaptive Simpson on [a, b] (finite endpoints). */
function simpson(f: Real, a: number, b: number): number {
  const s = (fa: number, fm: number, fb: number, w: number) => (w / 6) * (fa + 4 * fm + fb);
  const rec = (a: number, b: number, fa: number, fm: number, fb: number, whole: number, eps: number, depth: number): number => {
    const m = (a + b) / 2;
    const lm = (a + m) / 2;
    const rm = (m + b) / 2;
    const flm = f(lm);
    const frm = f(rm);
    const left = s(fa, flm, fm, m - a);
    const right = s(fm, frm, fb, b - m);
    if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
    return rec(a, m, fa, flm, fm, left, eps / 2, depth - 1) + rec(m, b, fm, frm, fb, right, eps / 2, depth - 1);
  };
  const fa = f(a);
  const fb = f(b);
  const fm = f((a + b) / 2);
  return rec(a, b, fa, fm, fb, s(fa, fm, fb, b - a), 1e-11, 40);
}

/** Tanh-sinh quadrature: never evaluates the endpoints, so it copes with integrable endpoint singularities. */
function tanhSinh(f: Real, a: number, b: number): number {
  const c = (a + b) / 2;
  const r = (b - a) / 2;
  let prev = NaN;
  for (let level = 3; level <= 8; level++) {
    const h = 2 ** -level;
    let sum = 0;
    for (let k = -Math.ceil(4 / h); k <= Math.ceil(4 / h); k++) {
      const u = k * h;
      const sh = (Math.PI / 2) * Math.sinh(u);
      const t = Math.tanh(sh);
      const w = ((Math.PI / 2) * Math.cosh(u)) / Math.cosh(sh) ** 2;
      if (w < 1e-300 || Math.abs(t) >= 1) continue;
      const y = f(c + r * t);
      if (Number.isFinite(y)) sum += w * y;
    }
    const est = r * h * sum;
    if (Math.abs(est - prev) <= 1e-12 * Math.max(1, Math.abs(est))) return est;
    prev = est;
  }
  return prev;
}

export function integrate(f: Real, a: number, b: number): number {
  if (a === b) return 0;
  if (a > b) return -integrate(f, b, a);
  return Number.isFinite(f(a)) && Number.isFinite(f(b)) && Number.isFinite(f((a + b) / 2)) ? simpson(f, a, b) : tanhSinh(f, a, b);
}

/** Limit at a finite point by the Laurent coefficients on small complex circles (no cancellation), else real one-sided values. */
function limitAt(fn: ReturnType<typeof compileIn>, a: number, L: number): boolean {
  const N = 64;
  for (const r of [0.25, 0.05, 0.01].map((k) => k * Math.max(1, Math.abs(a)))) {
    const vals: Cplx[] = [];
    for (let j = 0; j < N; j++) {
      const th = (2 * Math.PI * j) / N;
      const v = fn.complex({ re: a + r * Math.cos(th), im: r * Math.sin(th) });
      if (!v) break;
      vals.push(v);
    }
    if (vals.length < N) continue;
    const size = Math.max(1, ...vals.map((v) => Math.hypot(v.re, v.im)));
    // b_m r^m = mean of g · e^{-imθ}; need b_0 = L and no negative powers.
    const coef = (m: number) => {
      let re = 0;
      let im = 0;
      for (let j = 0; j < N; j++) {
        const th = (-2 * Math.PI * m * j) / N;
        re += vals[j].re * Math.cos(th) - vals[j].im * Math.sin(th);
        im += vals[j].re * Math.sin(th) + vals[j].im * Math.cos(th);
      }
      return Math.hypot(re / N, im / N);
    };
    const b0 = vals.reduce((s, v) => ({ re: s.re + v.re / N, im: s.im + v.im / N }), { re: 0, im: 0 });
    const noPoles = [1, 2, 3, 4, 5, 6].every((m) => coef(-m) <= 1e-7 * size);
    if (noPoles && Math.abs(b0.im) <= 1e-7 * size && near(b0.re, L, 1e-6)) return true;
  }
  let sides = 0;
  for (const side of [1, -1]) {
    const vals = [1e-3, 1e-4, 1e-5, 1e-6].map((d) => fn.real(a + side * d * Math.max(1, Math.abs(a))));
    if (!vals.some(Number.isFinite)) continue;
    if (!vals.some((v) => Number.isFinite(v) && near(v, L, 1e-4))) return false;
    sides++;
  }
  return sides > 0;
}

/** Limit as x → ∞: values at large x settle on L. */
function limitAtInfinity(f: Real, L: number): boolean {
  const vals = [1e3, 1e4, 1e5, 1e6].map(f).filter(Number.isFinite);
  return vals.length >= 2 && near(vals[vals.length - 1], L, 1e-4);
}

const usesSymbol = (expr: string, name: string) => {
  try {
    return math.parse(expr).filter((n) => (n as { isSymbolNode?: boolean }).isSymbolNode === true && (n as unknown as { name: string }).name === name).length > 0;
  } catch {
    return false;
  }
};

/** Run one symbolic check. Never throws. */
export function runSymbolicCheck(c: SymbolicCheck, variables: { name: string; value: number }[] = []): SymbolicResult {
  const res = (ok: boolean, detail: string): SymbolicResult => ({ part: c.part, kind: c.kind, ok, detail });
  if (!IDENT.test(c.variable)) return res(false, `variable "${c.variable}" is not a simple identifier`);
  let f: ReturnType<typeof compileIn>;
  let g: ReturnType<typeof compileIn>;
  try {
    f = compileIn(c.expr, c.variable, variables);
  } catch (e) {
    return res(false, `expr "${c.expr}" is not a valid mathjs expression (${(e as Error).message})`);
  }
  try {
    g = compileIn(c.claimed, c.variable, variables);
  } catch (e) {
    return res(false, `claimed "${c.claimed}" is not a valid mathjs expression (${(e as Error).message})`);
  }
  const seed = `${c.kind}|${c.expr}|${c.claimed}`;
  const domain: [number, number] = [c.domain[0], c.domain[1]];

  switch (c.kind) {
    case "derivative": {
      const r = derivativeAgreement(f.real, g.real, domain, seed, "claimed derivative =");
      return res(r.ok, r.detail);
    }
    case "integral": {
      const r = derivativeAgreement(g.real, f.real, domain, seed, "integrand =");
      return res(r.ok, r.ok ? `d/d${c.variable} of the antiderivative ${r.detail}` : `d/d${c.variable} of the claimed antiderivative ≠ integrand: ${r.detail}`);
    }
    case "definite_integral": {
      if (c.lower === null || c.upper === null) return res(false, "definite_integral needs numeric lower and upper limits");
      const value = g.real(0);
      if (!Number.isFinite(value)) return res(false, `claimed value "${c.claimed}" is not a number`);
      const num = integrate(f.real, c.lower, c.upper);
      if (!Number.isFinite(num)) return res(false, "the integrand could not be integrated numerically over the interval");
      return near(num, value, 1e-6)
        ? res(true, `numerical integral ${fmt(num)} = claimed ${fmt(value)}`)
        : res(false, `numerical integral over [${c.lower}, ${c.upper}] is ${fmt(num)} but claimed ${fmt(value)}`);
    }
    case "identity": {
      const pts = samplePoints(domain, seed, (x) => Number.isFinite(f.real(x)) && Number.isFinite(g.real(x)));
      if (pts.length < MIN_POINTS) return res(false, `only ${pts.length} points in [${domain.join(", ")}] where both sides are defined`);
      const bad = pts.filter((x) => !near(f.real(x), g.real(x), 1e-7));
      return bad.length === 0
        ? res(true, `both sides agree at ${pts.length} random points`)
        : res(false, `at ${c.variable} = ${fmt(bad[0])}: left side ${fmt(f.real(bad[0]))}, right side ${fmt(g.real(bad[0]))}`);
    }
    case "limit": {
      const L = g.real(0);
      if (!Number.isFinite(L)) return res(false, `claimed limit "${c.claimed}" is not a number`);
      const ok = c.lower === null ? limitAtInfinity(f.real, L) : limitAt(f, c.lower, L);
      const at = c.lower === null ? "∞" : String(c.lower);
      return ok ? res(true, `limit as ${c.variable} → ${at} is ${fmt(L)}`) : res(false, `the expression does not tend to ${fmt(L)} as ${c.variable} → ${at}`);
    }
    case "sum": {
      if (c.lower === null || !Number.isInteger(c.lower)) return res(false, "sum needs an integer lower limit");
      if (c.upper !== null && (!Number.isInteger(c.upper) || c.upper < c.lower)) return res(false, "sum needs an integer upper limit ≥ lower");
      const closedForm = usesSymbol(c.claimed, c.variable);
      const last = c.upper ?? c.lower + 29;
      if (last - c.lower > 1e6) return res(false, "sum is too long to check");
      const checkpoints = new Set<number>();
      if (closedForm) for (let N = c.lower; N <= Math.min(last, c.lower + 29); N++) checkpoints.add(N);
      checkpoints.add(last);
      let sum = 0;
      for (let n = c.lower; n <= last; n++) {
        const t = f.real(n);
        if (!Number.isFinite(t)) return res(false, `term undefined at ${c.variable} = ${n}`);
        sum += t;
        if (!checkpoints.has(n)) continue;
        const want = g.real(n);
        if (!near(sum, want, 1e-9)) {
          return res(false, closedForm ? `for ${c.variable} = ${n} the sum is ${fmt(sum)} but the closed form gives ${fmt(want)}` : `the sum is ${fmt(sum)} but claimed ${fmt(want)}`);
        }
      }
      return res(true, closedForm ? `closed form matches the partial sums for ${checkpoints.size} values of ${c.variable}` : `sum = ${fmt(sum)}`);
    }
  }
}

/** Problems with a question's symbolic checks (each check that fails, or refers to an unknown part). */
export function checkSymbolicChecks(checks: SymbolicCheck[], variables: { name: string; value: number }[], parts?: Set<string>): string[] {
  const problems: string[] = [];
  for (const c of checks) {
    const where = `Symbolic check (${c.part || "whole"}, ${c.kind})`;
    if (parts && !parts.has(c.part)) problems.push(`${where}: part "${c.part}" is not in the marking scheme`);
    const r = runSymbolicCheck(c, variables);
    if (!r.ok) problems.push(`${where}: ${r.detail}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Whole-question checks

function dollarsBalanced(text: string) {
  const n = (text.replace(/\\\$/g, "").match(/\$/g) ?? []).length;
  return n % 2 === 0;
}

/** How many of 21 evenly spaced x in [a, b] give a finite value; null if the expression doesn't compile. */
function finiteSamples(expr: string, a: number, b: number): number | null {
  let fn: Real;
  try {
    fn = compileIn(expr, "x", []).real;
  } catch {
    return null;
  }
  let finite = 0;
  for (let i = 0; i <= 20; i++) if (Number.isFinite(fn(a + ((b - a) * i) / 20))) finite++;
  return finite;
}

function checkGraph(g: Graph): string[] {
  const problems: string[] = [];
  if (!(g.xMin < g.xMax) || !(g.yMin < g.yMax)) problems.push("Graph window is empty (min ≥ max)");
  for (const f of g.functions) {
    const [a, b] = f.domain ?? [g.xMin, g.xMax];
    if (f.domain && !(a < b)) problems.push(`Graph function "${f.expr}" has an empty domain`);
    try {
      math.compile(f.expr);
    } catch (e) {
      problems.push(`Graph function "${f.expr}" is not a valid mathjs expression in x (${(e as Error).message})`);
      continue;
    }
    if ((finiteSamples(f.expr, a, b) ?? 0) < 5) problems.push(`Graph function "${f.expr}" is undefined over most of the window`);
  }
  for (const a of g.asymptotes ?? []) {
    const [lo, hi] = a.axis === "vertical" ? [g.xMin, g.xMax] : [g.yMin, g.yMax];
    if (a.value < lo || a.value > hi) problems.push(`Graph asymptote ${a.axis === "vertical" ? "x" : "y"} = ${a.value} is outside the window`);
  }
  for (const r of g.regions ?? []) {
    if (!(r.from < r.to)) problems.push(`Graph region needs from < to (got ${r.from}, ${r.to})`);
    for (const expr of [r.upper, r.lower]) {
      const n = finiteSamples(expr, r.from, r.to);
      if (n === null) problems.push(`Graph region boundary "${expr}" is not a valid mathjs expression in x`);
      else if (n < 5) problems.push(`Graph region boundary "${expr}" is undefined over most of [${r.from}, ${r.to}]`);
    }
  }
  return problems;
}

const LABELS = ["A", "B", "C", "D"] as const;

/** Everything wrong with a generated maths question, found by code rather than by the AI. Empty = passed. */
export function checkMathQuestion(c: QuestionContent, kind: QuestionKind): string[] {
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

  // Variables
  const names = new Set<string>();
  for (const v of c.variables) {
    if (!IDENT.test(v.name)) problems.push(`Variable name "${v.name}" is not a simple identifier`);
    if (names.has(v.name)) problems.push(`Variable "${v.name}" is defined twice`);
    names.add(v.name);
  }

  // Answers: arithmetic and display
  for (const a of c.answers) {
    const label = a.part ? `Answer (${a.part})` : "Answer";
    let computed: number;
    try {
      computed = evaluateExpression(a.expression, c.variables);
    } catch (e) {
      problems.push(`${label}: expression "${a.expression}" could not be evaluated (${(e as Error).message})`);
      continue;
    }
    if (!closeEnough(a.value, computed)) problems.push(`${label}: claimed ${a.value} but ${a.expression} = ${computed}`);
    if (compareDisplay(a.display, computed) === "mismatch") {
      problems.push(`${label}: displayed answer "${a.display}" does not match the computed value ${computed}`);
    }
  }

  if (kind === "mc") {
    if (c.options.length !== 4) problems.push(`MC question has ${c.options.length} options instead of 4`);
    if (c.options.some((o, i) => o.label !== LABELS[i])) problems.push("MC options must be labelled A, B, C, D in order");
    const texts = c.options.map((o) => o.text.replace(/\s+/g, ""));
    if (new Set(texts).size !== texts.length) problems.push("Two MC options are identical");
    const correct = c.options.find((o) => o.label === c.correctOption);
    if (!correct) {
      problems.push("MC question has no valid correct option");
    } else {
      if (c.answers.length > 0) {
        const target = c.answers[c.answers.length - 1].value;
        if (compareDisplay(correct.text, target) === "mismatch") {
          problems.push(`Correct option ${correct.label} ("${correct.text}") does not match the answer ${target}`);
        }
        for (const o of c.options) {
          if (o.label === correct.label) continue;
          if (compareDisplay(o.text, target) === "match" && compareDisplay(correct.text, target) !== "unknown") {
            problems.push(`Option ${o.label} ("${o.text}") has the same value as the correct option`);
          }
        }
      }
      const wrong = LABELS.filter((l) => l !== c.correctOption);
      const noted = new Set(c.distractorNotes.map((d) => d.label));
      for (const l of wrong) if (!noted.has(l)) problems.push(`Distractor ${l} has no misconception note`);
      if (noted.has(c.correctOption!)) problems.push("The correct option must not have a distractor note");
      for (const d of c.distractorNotes) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.tag)) problems.push(`Distractor tag "${d.tag}" is not kebab-case`);
    }
  } else {
    if (c.options.length > 0 || c.correctOption) problems.push("Only MC questions have options");
    if (c.markingScheme.length === 0) problems.push("Written questions need a marking scheme");
    for (const p of c.markingScheme) {
      if (p.items.length === 0) problems.push(`Marking scheme part "${p.part}" has no marks`);
      if (p.marks !== p.items.length) problems.push(`Marking scheme part "${p.part}" says ${p.marks} marks but lists ${p.items.length} items (one item per mark)`);
      const last = p.items[p.items.length - 1];
      if (last && last.type !== "A") problems.push(`Marking scheme part "${p.part}" should end with an A mark`);
    }
    const parts = new Set(c.markingScheme.map((p) => p.part));
    for (const a of c.answers) if (!parts.has(a.part)) problems.push(`Answer part "${a.part}" is not in the marking scheme`);
  }

  if (c.figure) {
    problems.push(...checkDiagram(c.figure));
    const labels = [...c.figure.segments.map((s) => s.label), ...c.figure.angles.map((a) => a.label), ...c.figure.circles.map((ci) => ci.label)];
    if (labels.some((l) => l?.includes("$"))) problems.push("Figure labels are plain text: don't use $ or LaTeX in them (write 5 cm, 35°, θ)");
  }
  if (c.graph) problems.push(...checkGraph(c.graph));
  if (c.symbolicChecks?.length) {
    const parts = kind === "mc" ? undefined : new Set(c.markingScheme.map((p) => p.part));
    problems.push(...checkSymbolicChecks(c.symbolicChecks, c.variables, parts));
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Student answers

/**
 * Compare a student's written final answer with the key. "match" | "mismatch" | "unknown"
 * (unknown: not a plain number, e.g. an expression in x, an interval or a verdict).
 */
export function compareStudentAnswer(studentLatex: string, expected: { value: number; display: string }): "match" | "mismatch" | "unknown" {
  const n = latexToNumber(studentLatex);
  if (n === null) return "unknown";
  const d = Math.max(decimalsShown(studentLatex), 0);
  // Accept the student's rounding or the key's rounding.
  if (closeEnough(n, expected.value, d) || compareDisplay(expected.display, n) === "match") return "match";
  return "mismatch";
}
