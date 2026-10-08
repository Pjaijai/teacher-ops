import cpUnits from "../../../../syllabus/math-compulsory.json";
import m1Units from "../../../../syllabus/m1.json";
import m2Units from "../../../../syllabus/m2.json";
import { z } from "zod";
import { DIAGRAM_RULES, DiagramSchema, GraphSchema, type Diagram, type Graph } from "@/lib/schemas/diagram";
import type { Subject } from "@/lib/subjects";

/**
 * Shared prompt text for the maths practice feature (CP, M1, M2).
 * Distilled from syllabus/*-question-design.md — citations to past papers stay internal.
 */

type Unit = { id: string; strand: string; nameEn: string; nameZh: string; foundation: string | null; objectives: { id: string; textEn: string }[] };

export type SubjectProfile = {
  name: string;
  units: Unit[];
  /** Archetypes, traps and distractor recipe for this subject. */
  designNotes: string;
  /** How final answers are given (the paper's accuracy instruction). */
  accuracy: string;
  /** M1/M2: symbolic answers (derivatives, integrals, identities, sums…) are verified by code at random points. */
  symbolic: boolean;
  /** Units with no exam questions (Further Learning Unit: inquiry and investigation). */
  skipUnits: string[];
};

const CP_DESIGN_NOTES = `HKDSE Mathematics Compulsory Part — question design (from past papers).

Paper 2 (MC) formats: single-key calculation (most items); (I)(II)(III) statement items with the menu
"I only / II only / I and II only / I and III only / II and III only / I, II and III" (one core fact, one near-miss,
one that fails on a boundary or special case); figure/graph reading; "must be true" single statement.

MC distractor recipe — ONE named slip per wrong option; the key is the only option with no slip; numeric options in
ascending order; answers come out exact or to 3 sig. fig. Slips to use:
sign error; inverted ratio; forgot ± / lost a root (divided by a factor); "or" treated as "and" (union vs intersection);
forgot to flip the inequality when dividing by a negative; rounding down vs nearest / wrong bound ends;
wrong compounding rule (simple vs compound, period); percentage base error; answered the wrong unknown;
stopped at an intermediate quantity; off-by-one in n; height vs slant height; area/volume mix (curved vs total,
sphere vs hemisphere); forgot to square/cube the scale factor; wrong rotation direction or quadrant;
perpendicular slope without the minus; with vs without replacement; "exactly" vs "at least"; weighted mean with
weights swapped; misread a figure (frequency read as value, quartile vs median); HCF vs LCM exponents;
log base conversion forgotten; standard score using the wrong sd or giving the mean; linear programming at the
wrong vertex; place-value shift in number bases; complex numbers i² sign; assumed perpendicular / special case.

Paper 1 (conventional) archetypes:
- P1 change of subject / algebraic fractions (trap: x on both sides → factorise). P2 indices, answer with positive
  indices. P3 factorisation staircase (parts (a),(b) give factors used in (c)).
- P4 compound inequality ("and"/"or") then count integers or least/greatest integer.
- P5 percentages: base change, discount-and-profit chain, "gain or loss?" verdict.
- P6 ratios / simultaneous equations (three-way ratio a:b:c). P7 approximation: does a claim hold? compare ranges.
- P8 variation "partly constant and partly varies as x / x²": two conditions → constants, then discriminant for
  real roots / range of k.
- P9 polynomials: remainder & factor theorem to find constants, then roots ("how many rational roots? explain").
- P10 quadratics: roots sum/product, completing the square, vertex, transformations of graphs.
- P11 exponential & logarithmic functions: log-linear graph, change of base, reject roots violating a condition.
- P12 arithmetic & geometric sequences: GP link gives d, then a quadratic inequality in n, round UP for least n.
- S1 geometry proof (congruent/similar triangles with reasons in brackets) then a calculation using it.
- S2 circle properties & angle chasing. S3 mensuration with similar solids (area ratio k², volume ratio k³;
  frustum total surface area includes both ends), final verdict. S4 3D trigonometry (sine/cosine rule, angle
  between planes needs perpendiculars to the common line, verdict "exceeds 45°?").
- S5 polar coordinates. S6 transformations in the coordinate plane. S7 straight lines and locus (equidistant →
  perpendicular bisector). S8 circle equation, tangent (Δ = 0 or radius ⊥ tangent), chord. S9 triangle centres.
- D1 table / stem-and-leaf with an unknown, then mean/median/mode/IQR/SD. D2 least/greatest possible dispersion
  (enumerate). D3 effect of adding/removing data. D4 box-and-whisker. D5 probability by combinations, part (b)
  a complement or two-stage draw.

Scaffolding of multi-part questions: chain the parts — (a) produces a number, relation or proof that (b) needs
("hence"). New information may be released between parts. About one question in three ends with a verdict part
("Is the claim correct? Explain.", 2–4 marks) needing a computed value AND a stated conclusion.
Mark sizes: describe/state 1; substitute-and-solve 3 (1M+1M+1A); proof 2–3; "hence" 2–4; verdict 2–4.
Section A(1) short questions are 3–5 marks, A(2) 6–9, Section B up to 12. A "short" question here = one or two
parts, 3–5 marks. A "long" question = 2–4 chained parts, 6–12 marks.

Common traps to build in: percentage base switch; rejecting a root that violates a condition; several digit
solutions; unknown count constrained by a median or range; claims need a number; 3D slant height vs vertical
height; round up for "least n"; "correct to 3 significant figures"; exact form "in terms of π" / "in surd form".

Numbers: choose clean numbers (Pythagorean triples, factorable quadratics, integer or simple surd answers) and
verify every value. Final non-exact answers are given to 3 significant figures.`;

const M1_DESIGN_NOTES = `HKDSE Mathematics Extended Part Module 1 (Calculus and Statistics) — question design (from past papers).

Paper: one 2½-hour paper, all compulsory. Section A (50 marks): 8 short questions of 5–8 marks, 2–4 parts.
Section B (50 marks): 4 long questions of 11–14 marks, 3–6 parts. About 55% calculus, 45% statistics.
Cover instruction: "Unless otherwise specified, numerical answers must be exact or given to 4 decimal places."
The ONLY table provided is the standard normal table A(z) = P(0 ≤ Z ≤ z), z = 0.00–3.59 in steps of 0.01, to 4 d.p.
There is NO binomial, Poisson, inverse-normal or t table: binomial/Poisson probabilities are computed by formula.
M1 has no MC paper; if an MC item is asked for, use a one-step calculation with slip-based distractors.

Statistics archetypes:
- S1 discrete r.v. table/formula with unknown constants: Σp = 1, then E(X) or Var(aX+b) gives a second equation
  (often a quadratic; REJECT a root outside the stated range or non-integer). Follow-ups: conditional probability inside
  the table, independence of two events defined on X, sample mean of n observations (E = μ, Var = σ²/n).
- S2 E/Var of linear forms (Var(aX+b) = a²Var(X)); "Could Y be Poisson?" (mean ≠ variance); "could X be binomial?"
  (npq > np impossible).
- S3 events: conditional probability, P(A∪B), test independence by P(A∩B) = P(A)P(B), mutually exclusive by P(A∩B) ≠ 0
  or P(A)+P(C) > 1; a range of P(A) from two inequalities; "prove P(A) = …".
- S4 total probability and Bayes on a two-stage tree (test/disease, route/payment), final reversed conditional, maybe
  "is it less than 0.6?".
- S5 binomial: find p from P(Y = 0) or from a ratio of two probabilities (quadratic in p); least n with
  P(at least one) > c (logs, round UP); derived success probability from a two-step chain.
- S6 Poisson: rate conversion (per minute → per hour: multiply λ); sums of independent Poissons add means; thinning
  (each event "heavy" with prob. p → Po(λp)); a Poisson threshold defines a "busy/smooth day" that feeds a binomial;
  conditional on the total.
- S7 normal: standardise, use A(z), add/subtract 0.5 for tails. Reverse look-up: printed percentages that are EXACT
  table entries (e.g. 15.87% → z = −1, 30.85% → z = 0.5, 21.19% → z = −0.8) give clean μ and σ. Banded grades with
  prices → expected value; binomial on top of the normal ("at least 6 of 8"); "the 4th is the 2nd" (negative-binomial
  pattern); sample mean ~ N(μ, σ²/n).
- S8 confidence intervals: x̄ ± zσ/√n (σ known or s given), proportion p̂ ± z√(p̂(1−p̂)/n); inverse problems: width →
  confidence level, least n for a width (round UP); combine two samples with Σx and Σx²; "wider or narrower?".
  z values: 1.645 (90%), 1.96 (95%), 2.575 (99%), or a table look-up (98%: 2.33 from A = 0.4901, 98.5%: 2.43).
Calculus archetypes:
- C1 expansion of e^(kx) (to x² or x³) times or plus (1+ax)^m, "in ascending powers of x as far as the term in x³";
  a coefficient condition gives the unknown (cubic like a³ = 343, quadratic in k); then ln y linear in x, or a chain
  rule with x = 2^u.
- C2 exponential/log models: "express ln A as a linear function of t" → constants from slope and intercept; exact time
  (A = 2P → t = 20 ln 2) and the rate of change then; model with a polynomial factor P = a(…)e^(bt).
- C3 differentiation: product/chain on e^(1/(x−2)), quotient, fractional powers x^(2/3)(x+2)^(1/3) written as
  (Ax+B)/(…), logarithmic differentiation of a variable exponent; f'' too; tangent from a point NOT on the curve.
- C4 extrema: f' = 0 + sign table; closed-interval extrema include end points; "does g attain an extreme value at
  x = 0?" (f' = 0 without sign change); greatest slope of the tangent = max of f' (solve f'' = 0); "agree?" claims.
- C5 optimisation and related rates (fixed surface area → max volume; cone filling with similar triangles; constant
  diagonal 15–20–25).
- C6 integration: "by considering d/dx(x e^(mx)) / d/dx(x^(m+1) ln x), find ∫…"; substitution (u = ln x, u = √x,
  u = 1 + 2^(3x)); area: find the x-intercepts first and SPLIT the area where the curve crosses the axis; the normal-
  table bridge ∫₀^0.5 e^(−x²/2) dx = √(2π)·A(0.5); long-run value = limit as t → ∞.
- C7 trapezoidal rule with 4 or 5 sub-intervals (formula not printed), then over-/under-estimate from the sign of f''
  (f'' > 0 → over-estimate), then a "someone claims … exceeds …? Explain." part combining the estimate and convexity.
- C8 rates of change in context: total = integral of a rate, greatest rate from the second derivative, long-run rate
  by a limit.

Scaffolding: early parts produce the key object (du/dt, f'(x), a constant), later parts use it ("hence", "using (a)").
Section B stories release new information part by part. Put a "Do you agree? Explain." / "Is it possible?" claim at
the end of about one question in three (2–4 marks: a computed value AND a stated conclusion).
Lay-out of a long question: 1–2 mark set-up → 2–3 mark core calculation → hence/estimate → claim or limit.
A "short" question here = Section A style, 2–3 parts, 5–8 marks. A "long" question = Section B style, 3–5 chained
parts, 11–14 marks.
Marks: "find" with a table look-up 2–3; "prove" a given result 2–3; "explain/do you agree" 2–4; "hence estimate" 2.
Solutions state the distribution ("Let X be the number of …, X ~ Po(3.2)"), the formula, the substitution, the answer,
and write "(rejected)" by a discarded root.

Traps to build in: per-minute vs per-hour rate; root outside the allowed range; point not on the curve; round UP for
least n; area across the x-axis; limit vs value at an end point; stationary point that is not an extremum; "given that"
with a compound event; Var squares the coefficient (Var(3Y−1) = 9Var(Y)); independent vs mutually exclusive; combined
samples need Σx², not the mean of the two standard deviations.

Numbers: choose parameters so normal look-ups hit exact table entries (z with 2 d.p.) and calculus answers are exact
(e, ln, surds) or clean. Carry full precision and round to 4 d.p. only at the end. Compute every value yourself —
never trust remembered past-paper answers.`;

const M2_DESIGN_NOTES = `HKDSE Mathematics Extended Part Module 2 (Algebra and Calculus) — question design (from past papers).

Paper: one 2½-hour paper, all compulsory. Section A (50 marks): 8–9 short questions of 3–8 marks (rising).
Section B (50 marks): 4 long questions of 12–13 marks, 3–5 lettered parts: one curve question, one integration
staircase, one algebra question (3×3 system or matrices), one vectors question.
A formulae page gives only compound-angle, double-angle, product-to-sum and sum-to-product identities.
Answers are EXACT (surds, π, ln, fractions) — no decimals unless the question asks.
M2 has no MC paper; if an MC item is asked for, use a one-step calculation with slip-based distractors.

Archetypes:
- Induction (every year, 5–8 marks): prove Σ_{k=1}^{n} f(k) = closed form (polynomial, telescoping 1/(k(k+1)(k+2)),
  alternating (−1)^k, weighted Σ r·2^(−r)); then "using (a), evaluate Σ_{k=a}^{b}" as S_b − S_{a−1} (off-by-one trap).
  Layout: base case with both sides, "assume P(k) true", step, "P(k+1) true", closing sentence.
- Binomial theorem (every year, 4–6 marks): (1+mx)(1+5x)^n with two coefficients given → quadratic in n, REJECT the
  non-integer/negative root; product of two expansions (take only the needed terms); general term with a parameter in
  the exponent ("the 19th term is constant").
- Trig identities and equations: prove an identity by combining fractions / multiple-angle formula, then solve an
  equation on a RESTRICTED interval (reject out-of-range roots); tan 3x identity with exact-angle application.
- First principles (every year, 3–5 marks): f(x) = x/√(2+x), 1/(3x²+4), 1/√(5x+4), −x sin x at π/2 — part (a) proves an
  expression for f(a+h) − f(a), part (b) takes the limit (rationalise; sin h/h → 1 quoted).
- Differentiation applications: implicit differentiation with a parallel-tangent claim (check the points are ON the
  curve); d/dx of a ln/√ expression = kx/√(…) → find k, then recover a curve through a point; tangent/normal chain;
  inflexion claim needs a SIGN CHANGE of f''; related rates with a hidden parameter (h = 3 − 2e^(−t)); optimisation.
- Curve sketching package (Section B): vertical and oblique asymptotes (oblique by polynomial division), f', f'',
  increasing/decreasing, extrema, inflexion, symmetry (odd ⇒ rotational symmetry), then an area or volume.
- Integration: decomposition of the numerator p(denominator) + q(denominator)'; trig substitution (x = tan θ, x = sin θ,
  x = 2 sin θ); by parts once/twice (∫(ln x)², ∫e^(−x) sin 2mx "solve for the integral"); staircase with product-to-sum
  and a disguising substitution; symmetry lemma (g(x) + g(−x) = 1 with h even ⇒ ∫_{−a}^{a} gh = ∫_0^a h); king property
  x → π − x; ∫sec θ via ln(sec θ + tan θ).
- Area and volume: area between a curve and its tangent/normal/a line; disc method π∫y²dx (with substitution); spherical
  cap V = πh²(3r − h)/3 then a related rate.
- Matrices/determinants: parameter so two matrices commute (substitute back, some roots fail); A² + A + I = 0 ⇒ A³ = I;
  nilpotent shift B = I + A with binomial expansion; PAP⁻¹ = diagonal ⇒ Bⁿ; (I − A)(I + … + Aⁿ) = I − Aⁿ⁺¹.
- Systems of linear equations: 3×3 with parameters — unique solution iff det ≠ 0 (a range), infinitely many / no
  solution tested for EACH root of det = 0, general solution with a parameter t, then a test condition on all solutions.
- Vectors in R³: AB × AC, area of a triangle (½|…|), volume of a tetrahedron (⅙|scalar triple product|), projection
  onto a plane, ratio point BF : FC = 1 : t by a vector equation, "is E the circumcentre?/are O, B, G collinear?".

Scaffolding: "Prove … hence …" — (a) states a printed target, (b) is only reasonable using it; integration staircases;
compute-then-interpret. A short (Section A) question = 1–3 parts, 3–8 marks. A long (Section B) question = 3–5
chained parts, 12–13 marks, usually ending in a claim ("Do you agree? Explain.") or "does there exist …?".
Marks: first principles 4 = set-up 1 + algebra 1 + cancel h 1 + answer 1; induction 5; claim 2–4 (verdict + reason);
"hence" 3–6; area 3. Write "(rejected)" by every discarded root.

Traps: hidden restrictions (interval, n a positive integer, x ≠ pole); one of two roots fails a later test; a claim true
only by symmetry, or false by a global condition (no stationary point, discriminant < 0); inflexion needs a sign change;
odd integrand ⇒ signed integral 0, not the area; S_b − S_{a−1}; change the limits when substituting; matrix products
don't commute.

Numbers: integer roots, perfect-square discriminants when rational answers are intended, angles in the π/12 family.
Write each "prove" target FIRST and work backwards; recompute every value yourself.`;

export const SUBJECT_PROFILES: Partial<Record<Subject, SubjectProfile>> = {
  math_cp: {
    name: "HKDSE Mathematics Compulsory Part (S4–S6)",
    units: cpUnits as Unit[],
    designNotes: CP_DESIGN_NOTES,
    accuracy: "Final non-exact answers are given to 3 significant figures unless the question says otherwise.",
    symbolic: false,
    skipUnits: ["CP-20"],
  },
  math_m1: {
    name: "HKDSE Mathematics Extended Part Module 1 (Calculus and Statistics)",
    units: m1Units as Unit[],
    designNotes: M1_DESIGN_NOTES,
    accuracy:
      'Numerical answers must be exact or given to 4 decimal places ("cor. to 4 d.p."); normal-table probabilities are quoted to 4 d.p.',
    symbolic: true,
    skipUnits: ["M1-21"],
  },
  math_m2: {
    name: "HKDSE Mathematics Extended Part Module 2 (Algebra and Calculus)",
    units: m2Units as Unit[],
    designNotes: M2_DESIGN_NOTES,
    accuracy: "Answers are exact (fractions, surds, π, e, ln) unless the question asks for decimals.",
    symbolic: true,
    skipUnits: ["M2-18"],
  },
};

export function subjectProfile(subject: Subject): SubjectProfile {
  const p = SUBJECT_PROFILES[subject];
  if (!p) throw new Error(`No maths profile for ${subject}`);
  return p;
}

/** Compact unit list for prompts: "CP-7 [NFT] Arithmetic and geometric sequences… (等差數列…)". */
export function unitList(profile: SubjectProfile, ids?: string[]) {
  const units = ids?.length ? profile.units.filter((u) => ids.includes(u.id)) : profile.units.filter((u) => !profile.skipUnits.includes(u.id));
  return units.map((u) => `${u.id}${u.foundation ? ` [${u.foundation}]` : ""} ${u.nameEn} (${u.nameZh})`).join("\n");
}

export function unitDetail(profile: SubjectProfile, ids: string[]) {
  return profile.units
    .filter((u) => ids.includes(u.id))
    .map((u) => `${u.id} ${u.nameEn} (${u.nameZh})${u.foundation ? ` [${u.foundation}]` : ""}\n${u.objectives.map((o) => `  - ${o.id} ${o.textEn}`).join("\n")}`)
    .join("\n");
}

export const LATEX_RULES = `Formatting:
- All text fields are Markdown with LaTeX in $…$ (inline) or $$…$$ (display), rendered with KaTeX.
  Write EVERY mathematical expression in LaTeX: $x^2 - 5x + 6 = 0$, $\\frac{3}{4}$, $\\sqrt{3}$, $\\angle ABC = 35^\\circ$,
  $\\triangle ABC$, $\\pi$, $\\log_2 8$. This applies to the stem, options, solution, marking scheme, answers.display,
  taskAnalysis and tips. Escape backslashes properly in JSON.
- Units outside or inside the maths: "$13$ cm", "$12\\pi\\text{ cm}^2$".
- Figure labels (figure.segments[].label, angles[].label, circles[].label) are PLAIN TEXT drawn in an SVG:
  write "5 cm", "35°", "θ", "x" — never $ or backslashes there.`;

export function languageRules(language: "zh" | "en", subject: Subject = "math_cp") {
  const extended = subject === "math_m1" || subject === "math_m2";
  if (language === "zh") {
    const base = `Language: Traditional Chinese as used in Hong Kong HKDSE papers (繁體中文). Use DSE terminology:
求 (find), 證明 (prove), 由此 (hence), 試解釋你的答案 (explain your answer), 答案須準確至三位有效數字 (correct to 3 significant figures),
以 π 表示答案 (in terms of π), 以根式表示 (in surd form), 圖中 (in the figure), 斜邊, 畢氏定理, 等差數列, 等比數列, 判別式, 餘式定理,
因式定理, 軌跡, 垂直平分線, 標準差, 四分位數間距, 概率. Reasons in geometry proofs use HK abbreviations (e.g. 錯角, AC // DB).`;
    if (!extended) return base;
    return `${base}
Extended Part terms: 答案須準確至小數點後第四位 (correct to 4 decimal places), 求準確值 (find the exact value), 以 x 的升冪展開
(expand in ascending powers of x), 至 x³ 項 (as far as the term in x³), 首原理 (first principles), 數學歸納法 (mathematical
induction), 切線, 法線, 漸近線, 拐點, 極大值, 極小值, 梯形法則, 高估, 低估, 定積分, 不定積分, 分部積分法, 代換法, 旋轉體體積,
二項分佈, 泊松分佈, 正態分佈, 標準正態分佈表, 期望值, 方差, 置信區間, 樣本平均數, 條件概率, 獨立事件, 互斥事件, 行列式,
矩陣, 逆矩陣, 線性方程組, 向量積, 純量積, 你同意嗎？試解釋你的答案。`;
  }
  return `Language: English as printed in HKDSE papers ("Find …", "Prove that …", "Hence …", "Explain your answer.",
"correct your answer to ${subject === "math_m1" ? "4 decimal places" : "3 significant figures"}", "in terms of π", "in surd form", "In the figure, …").
Geometry reasons use HK abbreviations in brackets: (alt. ∠s, AC // DB), (vert. opp. ∠s), (∠ sum of △), (A.A.A.), (RHS).`;
}

export const MATHJS_RULES = `Answer-check rules (a program verifies your answers, so be exact):
- variables: name EVERY given number with a simple identifier (AB, BC, h, theta, p, n, lambda, mu, sigma …) and its value.
- answers[]: one entry per numeric answer (per part). expression is a mathjs expression using ONLY those variable
  names, numbers, + - * / ^, parentheses, sqrt(), nthRoot(x, n), cbrt(), exp(), ln() (natural log), log(x, base), log10(),
  pi, e, abs(), nCr(n, r), nPr(n, r), factorial(), the RADIAN trig functions sin(), cos(), tan(), sec(), csc(), cot(),
  asin(), acos(), atan(), and the DEGREE-based sind(), cosd(), tand(), asind(), acosd(), atand().
  Statistics helpers: binomPmf(n, p, k) = P(X = k) and binomCdf(n, p, k) = P(X ≤ k) for X ~ B(n, p);
  poissonPmf(lambda, k) and poissonCdf(lambda, k) for X ~ Po(λ); normCdf(z) = Φ(z) and normCdf(x, mu, sigma) = P(X ≤ x);
  normA(z) = P(0 ≤ Z ≤ z); tableA(z) = A(z) exactly as read from the printed 4-d.p. table; invNorm(p) = z with Φ(z) = p.
  Examples: sqrt(AB^2 + BC^2); BC / tand(theta); nCr(5, 2) / nCr(9, 2); 1 - poissonCdf(lambda, 2);
  0.5 - tableA((5.7 - mu) / sigma); ln(2) * 20.
- answers[].value: the exact unrounded numeric value of the expression. answers[].display: the answer as written
  in the marking scheme, e.g. "$13$ cm", "$11.2$ cm (cor. to 3 sig. fig.)", "$0.1056$ (cor. to 4 d.p.)", "$\\frac{6}{11}$",
  "$12\\pi\\text{ cm}^2$", "$20\\ln 2$". The number in display must equal value (after the stated rounding).
- Parts whose answer is not a single number (proofs, "show that", verdicts, equations, intervals, expressions)
  get NO answers entry; their correctness is carried by the marking scheme (and, for M1/M2, by symbolicChecks).
- answers[].part must match a markingScheme part label.`;

/** M1/M2: how to state symbolic answers so code can verify them at random points. */
export const SYMBOLIC_RULES = `Symbolic checks (M1/M2) — a program verifies every symbolic answer by evaluating it at random points:
- symbolicChecks[]: one entry for EVERY part whose answer (or printed "prove/show" target) is an expression rather than one
  number: derivatives, antiderivatives, definite integrals with exact values, identities, limits/first-principles results,
  closed forms of sums, binomial/exponential expansions, solved-for functions. Proof parts get an entry for the
  printed TARGET (the program checks the statement is true; the proof itself is marked by the scheme).
- Fields: part (a markingScheme part label), kind, expr, claimed, variable, lower, upper, domainMin, domainMax.
  expr and claimed are mathjs expressions in ONE variable (named in "variable") plus the names in variables[]
  (substitute any other constants). Use * explicitly (2*x, not 2x); e^x or exp(x); ln(x) for natural log; nthRoot(x, 3)
  or cbrt(x) for cube roots (x^(1/3) is complex for x < 0); radians for trig. No "+ C".
- kind "derivative": expr = f(x), claimed = your f'(x). kind "integral": expr = integrand, claimed = your antiderivative.
  kind "definite_integral": expr = integrand, lower/upper = the limits (numbers), claimed = your exact value
  (e.g. "pi/16", "2*ln(3) - 1"). kind "identity": expr = left side, claimed = right side (also for "find f(x)" results and
  full binomial expansions). kind "limit": lower = the point approached (lower = null means as variable → ∞),
  expr = the expression, claimed = the limit; first principles: expr = (f(a+h) - f(a))/h in h, lower = 0, claimed = f'(a).
  Truncated expansions ("as far as the term in x³"): kind "limit", expr = (f(x) - (your polynomial))/x^3, lower = 0,
  claimed = "0". kind "sum": expr = the general term in variable k, lower = first k, upper = last k (or null when the
  claim is a closed form in n); claimed = the sum's value, OR the closed form written in the SAME variable letter standing
  for the last index (e.g. expr "k^2", variable "k", claimed "k*(k+1)*(2*k+1)/6", lower 1, upper null).
- domainMin/domainMax: an interval INSIDE the domain of both expressions where they are continuous, away from poles and
  branch points (e.g. [0.5, 3] for ln x; [2.2, 6] for 1/(x-2)); for sums, the index range.
- Statistics and numeric parts still use answers[] (with the helpers above), not symbolicChecks.
- Parts that cannot be checked by code (a proof's reasoning, "explain", "do you agree?", induction structure, sketches)
  get a tip that starts "Not code-verified:" saying what the student must justify.`;

export const MARKING_SCHEME_RULES = `Marking scheme (HKEAA conventions):
- markingScheme: one entry per part ("" for a single-part question, else "a", "b", "b(i)", "b(ii)" …), with marks =
  the number of items. Each item is worth exactly ONE mark: "1M" items have type "M", "1A" items type "A".
- M marks are for a correct method (setting up the equation, substituting, using the right formula). A marks are
  for an accurate answer and need the correct unit and the requested accuracy/form. Each part normally ends with an A.
- ecf = true on an A mark only when the follow-through answer from an earlier wrong value is acceptable
  (typically a "hence" part using an earlier result). M marks always follow through.
- "Show that" / "prove" parts: the final result is given, so the marks are method marks for each necessary step
  (use type "M" for steps, and an "A" only for the final correct conclusion with all reasons).
- Verdict parts: 1M for the comparison/computation, 1A for the correct conclusion with the supporting value.
  Note in the item text that a wrong verdict scores 0 for the part.
- Item text says exactly what earns the mark, in LaTeX, e.g. "$x^2 - 5x + 6 = 0$ (correct equation)", "$x = 2$ or $x = 3$".
- Geometry proofs: each statement with its reason in brackets.
- MC questions: markingScheme = [] (one mark, keyed by correctOption).`;

export const FIGURE_RULES = `${DIAGRAM_RULES}
- Include a figure whenever the question says "in the figure" or a picture is needed to understand it; the figure
  must agree with the numbers in the stem (given lengths appear as segment labels, given angles as angle labels).
- For graphs of y = f(x) (quadratic graphs, exponential/log graphs, transformations) use "graph" instead.
- Statistics tables or stem-and-leaf diagrams are written in the stem as Markdown tables, not figures.`;

/** JSON formats for figures and graphs, given to the model as text (they travel as JSON strings). */
export const FIGURE_FORMATS = `FIGURE format (JSON Schema):
${JSON.stringify(stripMeta(z.toJSONSchema(DiagramSchema)))}

GRAPH format (JSON Schema):
${JSON.stringify(stripMeta(z.toJSONSchema(GraphSchema)))}`;

function stripMeta(s: unknown) {
  const { $schema: _x, ...rest } = s as Record<string, unknown>;
  return rest;
}

function issues(e: z.ZodError) {
  return e.issues
    .slice(0, 4)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

function parseJsonField<T>(text: string, schema: z.ZodType<T>, what: string): { value: T | null; problems: string[] } {
  const raw = text.trim();
  if (!raw || raw === "null" || raw === "{}") return { value: null, problems: [] };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { value: null, problems: [`${what} JSON is not valid JSON`] };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { value: null, problems: [`${what} JSON does not match the ${what.toUpperCase()} format (${issues(parsed.error)})`] };
  return { value: parsed.data, problems: [] };
}

export const parseFigureJson = (text: string) => parseJsonField<Diagram>(text, DiagramSchema, "figure");
export const parseGraphJson = (text: string) => parseJsonField<Graph>(text, GraphSchema, "graph");
