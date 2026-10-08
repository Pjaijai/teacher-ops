/** Offline self-test for the maths answer/figure checker and MC marking (no API calls). Run: npm run test:checks */
import assert from "node:assert/strict";
import type { QuestionContent, SymbolicCheck } from "../src/lib/schemas/question";
import {
  binomCdf,
  binomPmf,
  checkMathQuestion,
  compareDisplay,
  compareStudentAnswer,
  evaluateExpression,
  integrate,
  invNorm,
  latexToNumber,
  normCdf,
  poissonCdf,
  poissonPmf,
  runSymbolicCheck,
  tableA,
} from "../src/server/services/practice/check-answer";
import { markMc } from "../src/server/services/practice/mark-mc";

const base: QuestionContent = {
  stem: "In the figure, $\\angle B = 90^\\circ$, $AB = 5$ cm and $BC = 12$ cm. Find $AC$.",
  materials: null,
  figure: {
    kind: "geometry",
    points: [
      { id: "A", x: 0, y: 5, showLabel: true, showDot: false },
      { id: "B", x: 0, y: 0, showLabel: true, showDot: false },
      { id: "C", x: 12, y: 0, showLabel: true, showDot: false },
    ],
    segments: [
      { from: "A", to: "B", label: "5 cm", dashed: false },
      { from: "B", to: "C", label: "12 cm", dashed: false },
      { from: "A", to: "C", label: "x", dashed: false },
    ],
    circles: [],
    rightAngles: [{ vertex: "B", a: "A", b: "C" }],
    angles: [],
    axes: null,
    notToScale: false,
  },
  graph: null,
  options: [],
  correctOption: null,
  distractorNotes: [],
  variables: [
    { name: "AB", value: 5 },
    { name: "BC", value: 12 },
  ],
  answers: [{ part: "", expression: "sqrt(AB^2 + BC^2)", value: 13, unit: "cm", display: "$13$ cm" }],
  markingScheme: [
    {
      part: "",
      marks: 2,
      items: [
        { type: "M", text: "$AC^2 = 5^2 + 12^2$", ecf: false },
        { type: "A", text: "$AC = 13$ cm", ecf: false },
      ],
    },
  ],
  solution: ["$AC^2 = AB^2 + BC^2$", "$AC = \\sqrt{25 + 144} = 13$ cm"],
  taskAnalysis: "Right angle at $B$, so use Pythagoras' theorem.",
  tips: ["The hypotenuse is opposite the right angle."],
  writing: null,
};

// --- LaTeX → number
assert.equal(latexToNumber("$13$ cm"), 13);
assert.equal(latexToNumber("\\frac{7}{2}"), 3.5);
assert.equal(latexToNumber("x = \\dfrac{-3}{4}"), -0.75);
assert.ok(Math.abs(latexToNumber("2\\sqrt{3}")! - 2 * Math.sqrt(3)) < 1e-9, "2√3");
assert.ok(Math.abs(latexToNumber("\\sqrt[3]{27}")! - 3) < 1e-9, "cube root");
assert.ok(Math.abs(latexToNumber("12\\pi \\text{ cm}^2")! - 12 * Math.PI) < 1e-9, "π with unit");
assert.equal(latexToNumber("1,234.5"), 1234.5);
assert.equal(latexToNumber("AC \\approx 11.2 \\text{ cm (cor. to 3 sig. fig.)}"), 11.2);
assert.equal(latexToNumber("y = 2x + 1"), null, "expressions in a variable aren't numbers");
assert.equal(latexToNumber("51.5^\\circ"), 51.5);

assert.equal(compareDisplay("$11.2$ (cor. to 3 sig. fig.)", 11.2249), "match");
assert.equal(compareDisplay("$11.3$ cm", 11.2249), "mismatch");
assert.equal(compareDisplay("$x^2 - 1$", 3), "unknown");

// --- whole-question checks
assert.deepEqual(checkMathQuestion(base, "short"), [], "a correct question passes");

const wrongValue = { ...base, answers: [{ ...base.answers[0], value: 14, display: "$14$ cm" }] };
assert.ok(checkMathQuestion(wrongValue, "short").some((p) => p.includes("claimed 14")), "wrong arithmetic is caught");

const wrongDisplay = { ...base, answers: [{ ...base.answers[0], display: "$12$ cm" }] };
assert.ok(checkMathQuestion(wrongDisplay, "short").some((p) => p.includes("displayed answer")), "display mismatch is caught");

const wrongFigure = structuredClone(base);
wrongFigure.figure!.points[2].x = 10;
assert.ok(checkMathQuestion(wrongFigure, "short").some((p) => p.includes("BC")), "figure that disagrees with its label is caught");

const notRight = structuredClone(base);
notRight.figure!.points[0].x = 2;
assert.ok(checkMathQuestion(notRight, "short").some((p) => p.includes("right angle")), "fake right angle is caught");

const latexInFigure = structuredClone(base);
latexInFigure.figure!.segments[2].label = "$x$";
assert.ok(checkMathQuestion(latexInFigure, "short").some((p) => p.includes("plain text")), "LaTeX in figure labels is caught");

const badScheme = structuredClone(base);
badScheme.markingScheme[0].marks = 3;
assert.ok(checkMathQuestion(badScheme, "short").some((p) => p.includes("one item per mark")), "mark count mismatch is caught");

const unbalanced = { ...base, stem: "Find $AC." };
assert.ok(checkMathQuestion(unbalanced, "short").some((p) => p.includes("Unbalanced $")), "unbalanced $ is caught");

const mc: QuestionContent = {
  ...base,
  options: [
    { label: "A", text: "$13$ cm" },
    { label: "B", text: "$17$ cm" },
    { label: "C", text: "$\\sqrt{119}$ cm" },
    { label: "D", text: "$169$ cm" },
  ],
  correctOption: "A",
  distractorNotes: [
    { label: "B", misconception: "Added the two sides instead of using Pythagoras.", tag: "added-sides" },
    { label: "C", misconception: "Subtracted the squares: treated $BC$ as the hypotenuse.", tag: "wrong-hypotenuse" },
    { label: "D", misconception: "Forgot to take the square root.", tag: "forgot-square-root" },
  ],
  markingScheme: [],
};
assert.deepEqual(checkMathQuestion(mc, "mc"), [], "a correct MC question passes");
assert.ok(checkMathQuestion({ ...mc, correctOption: "B" }, "mc").some((p) => p.includes("does not match")), "wrong MC key is caught");
assert.ok(
  checkMathQuestion({ ...mc, options: mc.options.map((o) => (o.label === "D" ? { ...o, text: "$\\frac{26}{2}$ cm" } : o)) }, "mc").some((p) =>
    p.includes("same value"),
  ),
  "a distractor equal to the key is caught",
);
assert.ok(checkMathQuestion({ ...mc, distractorNotes: mc.distractorNotes.slice(0, 2) }, "mc").some((p) => p.includes("no misconception")), "missing distractor note is caught");

const trig: QuestionContent = {
  ...base,
  figure: null,
  variables: [
    { name: "BC", value: 10 },
    { name: "theta", value: 30 },
  ],
  answers: [{ part: "", expression: "BC * tand(theta)", value: 5.773502691896, unit: "cm", display: "$5.77$ cm (cor. to 3 sig. fig.)" }],
};
assert.deepEqual(checkMathQuestion(trig, "short"), [], "degree trig helpers work");

const counting: QuestionContent = {
  ...base,
  figure: null,
  variables: [{ name: "n", value: 10 }],
  answers: [{ part: "", expression: "nCr(n, 3) / nCr(n + 2, 3)", value: 120 / 220, unit: null, display: "$\\frac{6}{11}$" }],
};
assert.deepEqual(checkMathQuestion(counting, "short"), [], "nCr and fraction displays work");

const graphQ: QuestionContent = { ...base, figure: null, graph: { xMin: -3, xMax: 3, yMin: -5, yMax: 5, functions: [{ expr: "x^2 - 2*x - 3", label: null, dashed: false }], points: [] } };
assert.deepEqual(checkMathQuestion(graphQ, "short"), [], "a valid graph passes");
assert.ok(
  checkMathQuestion({ ...graphQ, graph: { ...graphQ.graph!, functions: [{ expr: "x^^2", label: null, dashed: false }] } }, "short").length > 0,
  "an invalid graph function is caught",
);


// --- statistics helpers (M1)
const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;
assert.ok(close(binomPmf(5, 0.3, 2), 10 * 0.09 * 0.343), "binomPmf");
assert.ok(close(binomCdf(4, 0.5, 1), 5 / 16), "binomCdf");
assert.equal(binomPmf(3, 0.5, 4), 0, "binomPmf outside support");
assert.ok(close(poissonPmf(2.1, 3), (Math.exp(-2.1) * 2.1 ** 3) / 6), "poissonPmf");
assert.ok(close(poissonCdf(3.2, 2), Math.exp(-3.2) * (1 + 3.2 + 3.2 ** 2 / 2)), "poissonCdf");
assert.ok(close(normCdf(1), 0.841344746068543, 1e-12), "normCdf standard");
assert.ok(close(normCdf(5.7, 5.1, 1.2), normCdf(0.5), 1e-12), "normCdf with μ, σ");
assert.equal(tableA(1.25), 0.3944, "table A(z)");
assert.equal(tableA(-0.5), -0.1915, "table A(z), negative z");
assert.ok(close(invNorm(0.975), 1.959963984540054, 1e-9), "invNorm");
assert.ok(close(invNorm(0.01), -2.326347874040841, 1e-9), "invNorm lower tail");
assert.ok(close(evaluateExpression("1 - poissonCdf(lambda, 2)", [{ name: "lambda", value: 3 }]), 1 - Math.exp(-3) * 8.5), "helpers in answer expressions");
assert.ok(close(evaluateExpression("0.5 - tableA(1)", []), 0.1587), "table lookup in answer expressions");
assert.ok(close(evaluateExpression("ln(e^2)", []), 2), "ln alias");
assert.ok(close(integrate((x) => 1 / Math.sqrt(x), 0, 4), 4, 1e-6), "endpoint singularity integrates");

// --- symbolic checks (M1/M2): correct ones pass, deliberately wrong ones fail
const sym = (c: Partial<SymbolicCheck> & Pick<SymbolicCheck, "kind" | "expr" | "claimed">): SymbolicCheck => ({
  part: "a",
  variable: "x",
  lower: null,
  upper: null,
  domain: [0.5, 3],
  ...c,
});
const passes = (c: SymbolicCheck, vars: { name: string; value: number }[] = []) => {
  const r = runSymbolicCheck(c, vars);
  assert.ok(r.ok, `expected pass: ${c.kind} ${c.expr} → ${c.claimed} (${r.detail})`);
};
const fails = (c: SymbolicCheck, vars: { name: string; value: number }[] = []) => {
  const r = runSymbolicCheck(c, vars);
  assert.ok(!r.ok, `expected failure: ${c.kind} ${c.expr} → ${c.claimed} (${r.detail})`);
};

// derivatives
passes(sym({ kind: "derivative", expr: "x * e^(1/(x-2))", claimed: "e^(1/(x-2)) * (1 - x/(x-2)^2)", domain: [2.2, 6] }));
passes(sym({ kind: "derivative", expr: "nthRoot(x, 3)^2 * nthRoot(x + 2, 3)", claimed: "(3*x + 4) / (3 * nthRoot(x, 3) * nthRoot(x + 2, 3)^2)", domain: [0.2, 5] }));
passes(sym({ kind: "derivative", expr: "(x^2 + x + e)^(2*x + 1)", claimed: "(x^2 + x + e)^(2*x + 1) * (2*ln(x^2 + x + e) + (2*x + 1)*(2*x + 1)/(x^2 + x + e))", domain: [-1, 1] }));
passes(sym({ kind: "derivative", expr: "ln(sqrt(x^4 + 9) - x^2)", claimed: "-2*x / sqrt(x^4 + 9)", domain: [-3, 3] }));
passes(sym({ kind: "derivative", expr: "k * x^3 - tan(x)", claimed: "3 * k * x^2 - sec(x)^2", domain: [-1.2, 1.2] }), [{ name: "k", value: 4 }]);
fails(sym({ kind: "derivative", expr: "nthRoot(x, 3)^2 * nthRoot(x + 2, 3)", claimed: "(11/2*x + 9) / (3 * nthRoot(x, 3) * nthRoot(x + 2, 3)^2)", domain: [0.2, 5] }));
fails(sym({ kind: "derivative", expr: "x * e^(1/(x-2))", claimed: "e^(1/(x-2)) * (1 + x/(x-2)^2)", domain: [2.2, 6] }));
fails(sym({ kind: "derivative", expr: "sin(2*x)", claimed: "cos(2*x)" }));
fails(sym({ kind: "derivative", expr: "ln(x)", claimed: "1/x", domain: [-3, -1] }), []); // undefined on the domain → too few points

// antiderivatives
passes(sym({ kind: "integral", expr: "(t^2 - 1)/(t^4 + 1)", claimed: "1/(2*sqrt(2)) * ln((t^2 - sqrt(2)*t + 1)/(t^2 + sqrt(2)*t + 1))", variable: "t", domain: [-3, 3] }));
passes(sym({ kind: "integral", expr: "x * e^(m*x)", claimed: "x*e^(m*x)/m - e^(m*x)/m^2 + C", domain: [-1, 2] }), [{ name: "m", value: 3 }]);
passes(sym({ kind: "integral", expr: "ln(x)^2", claimed: "x*ln(x)^2 - 2*x*ln(x) + 2*x", domain: [0.3, 5] }));
fails(sym({ kind: "integral", expr: "ln(x)^2", claimed: "x*ln(x)^2 - 2*x*ln(x)", domain: [0.3, 5] }));
fails(sym({ kind: "integral", expr: "x * e^(2*x)", claimed: "x*e^(2*x)/2 - e^(2*x)/2" }));

// definite integrals
passes(sym({ kind: "definite_integral", expr: "x^2 * sqrt(1 - x^2)", claimed: "pi/16", lower: 0, upper: 1, domain: [0, 1] }));
passes(sym({ kind: "definite_integral", expr: "(2*x - 1) * e^(-x^2/2)", claimed: "2*(1 - e^(-1/8)) - sqrt(2*pi)*normA(0.5)", lower: 0, upper: 0.5, domain: [0, 0.5] }));
passes(sym({ kind: "definite_integral", expr: "1/(1 + 3*x^2)^2", claimed: "pi/(6*sqrt(3)) + 1/8", lower: 0, upper: 1, domain: [0, 1] }));
passes(sym({ kind: "definite_integral", expr: "ln(x)/sqrt(x)", claimed: "-4", lower: 0, upper: 1, domain: [0, 1] }));
fails(sym({ kind: "definite_integral", expr: "(2*x - 1) * e^(-x^2/2)", claimed: "1.3558", lower: 0, upper: 0.5, domain: [0, 0.5] }));
fails(sym({ kind: "definite_integral", expr: "x^2 * sqrt(1 - x^2)", claimed: "pi/8", lower: 0, upper: 1, domain: [0, 1] }));
fails(sym({ kind: "definite_integral", expr: "x", claimed: "1", lower: null, upper: 1, domain: [0, 1] }));

// identities (trig proofs, binomial expansions)
passes(sym({ kind: "identity", expr: "tan(x)/(1 - cot(x)) + cot(x)/(1 - tan(x))", claimed: "1 + sec(x)*csc(x)", domain: [0.1, 1.4] }));
passes(sym({ kind: "identity", expr: "cos(3*x)", claimed: "4*cos(x)^3 - 3*cos(x)", domain: [-3, 3] }));
passes(sym({ kind: "identity", expr: "(1 + 2*x)^5", claimed: "1 + 10*x + 40*x^2 + 80*x^3 + 80*x^4 + 32*x^5", domain: [-2, 2] }));
passes(sym({ kind: "identity", expr: "nCr(n, 2) + nCr(n, 3)", claimed: "nCr(n + 1, 3)", variable: "n", domain: [3, 30] }));
fails(sym({ kind: "identity", expr: "cos(3*x)", claimed: "4*cos(x)^3 + 3*cos(x)", domain: [-3, 3] }));
fails(sym({ kind: "identity", expr: "(1 + 2*x)^5", claimed: "1 + 10*x + 40*x^2 + 80*x^3 + 80*x^4 + 30*x^5", domain: [-2, 2] }));

// limits (first principles, long-run values, truncated expansions)
passes(sym({ kind: "limit", expr: "((2 + h)/sqrt(4 + h) - 1)/h", claimed: "3/8", variable: "h", lower: 0, domain: [-1, 1] }));
passes(sym({ kind: "limit", expr: "sin(x)/x", claimed: "1", lower: 0 }));
passes(sym({ kind: "limit", expr: "32/(2^(5 - 0.5*t) + 8)", claimed: "4", variable: "t", lower: null }));
passes(sym({ kind: "limit", expr: "(1 + 1/x)^x", claimed: "e", lower: null }));
// e^(2x)(1 - 7x)^4 = 1 - 26x + 240x² - (2516/3)x³ + … : truncated expansion checked as a limit of (f - p)/x³
passes(sym({ kind: "limit", expr: "(e^(2*x)*(1 - 7*x)^4 - (1 - 26*x + 240*x^2 - 2516/3*x^3))/x^3", claimed: "0", lower: 0 }));
fails(sym({ kind: "limit", expr: "(e^(2*x)*(1 - 7*x)^4 - (1 - 26*x + 240*x^2 - 879*x^3))/x^3", claimed: "0", lower: 0 }));
fails(sym({ kind: "limit", expr: "(e^(2*x)*(1 - 7*x)^4 - (1 - 26*x + 241*x^2 - 2516/3*x^3))/x^3", claimed: "0", lower: 0 }));
fails(sym({ kind: "limit", expr: "((2 + h)/sqrt(4 + h) - 1)/h", claimed: "1/2", variable: "h", lower: 0, domain: [-1, 1] }));
fails(sym({ kind: "limit", expr: "32/(2^(5 - 0.5*t) + 8)", claimed: "32/9", variable: "t", lower: null }));

// sums (induction closed forms, evaluated ranges)
passes(sym({ kind: "sum", expr: "3*k^5 + k^3", claimed: "k^3*(k + 1)^3/2", variable: "k", lower: 1, upper: 40, domain: [1, 40] }));
passes(sym({ kind: "sum", expr: "1/(k*(k + 1)*(k + 2))", claimed: "1/4 - 1/(2*(k + 1)*(k + 2))", variable: "k", lower: 1, upper: null, domain: [1, 30] }));
passes(sym({ kind: "sum", expr: "1/(k*(k + 1)*(k + 2))", claimed: "1/(2*4*5) - 1/(2*124*125)", variable: "k", lower: 4, upper: 123, domain: [4, 123] }));
passes(sym({ kind: "sum", expr: "r * 2^(-r)", claimed: "2 - (r + 2)*2^(-r)", variable: "r", lower: 1, upper: 25, domain: [1, 25] }));
fails(sym({ kind: "sum", expr: "1/(k*(k + 1)*(k + 2))", claimed: "1/(2*3*4) - 1/(2*124*125)", variable: "k", lower: 4, upper: 123, domain: [4, 123] }));
fails(sym({ kind: "sum", expr: "3*k^5 + k^3", claimed: "k^3*(k + 1)^3/3", variable: "k", lower: 1, upper: 20, domain: [1, 20] }));

// symbolic checks inside a question
const calcQ: QuestionContent = {
  ...base,
  figure: null,
  variables: [],
  answers: [],
  markingScheme: [{ part: "a", marks: 2, items: [{ type: "M", text: "product rule", ecf: false }, { type: "A", text: "answer", ecf: false }] }],
  symbolicChecks: [sym({ kind: "derivative", expr: "x^2 * ln(x)", claimed: "2*x*ln(x) + x" })],
};
assert.deepEqual(checkMathQuestion(calcQ, "short"), [], "a question with a correct symbolic check passes");
assert.ok(
  checkMathQuestion({ ...calcQ, symbolicChecks: [sym({ kind: "derivative", expr: "x^2 * ln(x)", claimed: "2*x*ln(x)" })] }, "short").some((p) => p.includes("Symbolic check")),
  "a wrong derivative in a question is caught",
);
assert.ok(
  checkMathQuestion({ ...calcQ, symbolicChecks: [sym({ part: "z", kind: "derivative", expr: "x^2", claimed: "2*x" })] }, "short").some((p) => p.includes("not in the marking scheme")),
  "a symbolic check for an unknown part is caught",
);

// graphs with asymptotes and shaded regions (M1/M2)
const curveQ: QuestionContent = {
  ...base,
  figure: null,
  graph: {
    xMin: -2,
    xMax: 6,
    yMin: -10,
    yMax: 20,
    functions: [
      { expr: "(x^2 + 3*x)/(x - 1)", label: "y = f(x)", dashed: false, domain: null },
      { expr: "x + 4", label: null, dashed: true },
    ],
    points: [{ x: 3, y: 9, label: "A" }],
    asymptotes: [{ axis: "vertical", value: 1, label: "x = 1" }],
    regions: [{ upper: "(x^2 + 3*x)/(x - 1)", lower: "0", from: 2, to: 4, label: "R" }],
  },
};
assert.deepEqual(checkMathQuestion(curveQ, "short"), [], "a graph with asymptotes and regions passes");
assert.ok(
  checkMathQuestion({ ...curveQ, graph: { ...curveQ.graph!, regions: [{ upper: "ln(x)", lower: "0", from: -5, to: -1, label: null }] } }, "short").some((p) => p.includes("region")),
  "a region where the curve is undefined is caught",
);
assert.ok(
  checkMathQuestion({ ...curveQ, graph: { ...curveQ.graph!, asymptotes: [{ axis: "horizontal", value: 50, label: null }] } }, "short").some((p) => p.includes("asymptote")),
  "an asymptote outside the window is caught",
);

// --- student answers (used to override inconsistent A marks)
const key = { value: 11.2249, display: "$11.2$ cm" };
assert.equal(compareStudentAnswer("AC = 11.2 \\text{ cm}", key), "match");
assert.equal(compareStudentAnswer("AC \\approx 11.22", key), "match");
assert.equal(compareStudentAnswer("AC = 12.4 cm", key), "mismatch");
assert.equal(compareStudentAnswer("x > 3", key), "unknown");
assert.equal(compareStudentAnswer("\\frac{6}{11}", { value: 6 / 11, display: "$\\frac{6}{11}$" }), "match");

// --- MC marking
const right = markMc(mc, "A");
assert.equal(right.correct, true);
assert.equal(right.misconception, null);
const wrong = markMc(mc, "D");
assert.equal(wrong.correct, false);
assert.equal(wrong.tag, "forgot-square-root");
assert.equal(wrong.correctOption, "A");

console.log("All checker self-tests passed.");
