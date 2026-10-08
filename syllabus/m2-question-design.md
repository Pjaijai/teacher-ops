# HKDSE Mathematics Extended Part M2 (Algebra and Calculus) — how the questions are built

Status: **draft v0.1 (2026-10-07), awaiting review by a Maths teacher.**

These notes are distilled from the HKEAA Level 5 sample candidate scripts in `paper/math/m2/` (unofficial copies, git-ignored): 2020–2025, one paper per year. Each file is a printed Question-Answer Book with a strong candidate's handwritten working.
- **2024, 2023, 2022, 2021, 2020 and 2025:** every question read.
- **2022–2025 files:** contain two exemplars of the same paper; only Exemplar 1 was read.
- **Scripts are not model answers.** The candidate's working is only an unofficial reference. Several Level 5 scripts contain slips or blanks, and we flag them where we noticed (2025 Q8(b), 2025 Q10(e), 2021 Q5(c), 2020 Q8(b)(ii), 2025 Q7(c) left blank, etc.). Every worked answer a generator uses must be recomputed (see §6).
- **There is no HKEAA marking scheme in these files.** Marks per part are printed in the paper, but M/A tags are not shown. §4 is therefore partly *inferred* from general HKDSE practice.

Citations look like `M2 2023 Q7` (year, Q number; sub-part after a dot, e.g. `M2 2023 Q7(b)(ii)`). Unit IDs `M2-<n>` are from [m2.md](m2.md) (the units are listed in §3 and used as tags throughout).

Caveats:
- The transcription of questions is by summary. Exact numbers in our descriptions (coefficients, limits, interval ends) were checked against the pages for 2020, 2021 and 2025, and spot-checked for 2022–2024. A teacher should check any number before reuse.
- We never copy a whole question. A generator must build fresh numbers and wording.
- We could not verify the 2027/2028 "elementary short questions" change against a paper. The 2020–2025 papers still have the old "short questions" Section A; see m2.md §1.

---

## 1. Paper blueprint

**2½ hours, one paper, all questions compulsory, 100 marks.**
- A **formulae page** opens every paper. It gives compound angle, double angle (as 2sinAcosB forms), product-to-sum and sum-to-product identities. Nothing else is given: no derivative or integral table, no binomial formula, no matrix formulae.
- **Section A (50 marks):** 8 or 9 short questions of 3–8 marks.
- **Section B (50 marks):** 4 long questions of 12–13 marks, each with 3–5 lettered parts.
- Exact-form answers (surds, π, ln) are the norm in the correct scripts; we did not read the cover-page instructions (the cover pages in the files are blank or omitted).

### Marks and counts by year

| Year | Section A questions | Section A marks (Q1…) | Section B marks (Q…) |
|---|---|---|---|
| 2020 | 8 | 4, 4, 6, 6, 7, 7, 8, 8 | 12, 13, 13, 12 |
| 2021 | 8 | 4, 5, 6, 6, 7, 7, 7, 8 | 12, 13, 12, 13 |
| 2022 | 8 | 4, 5, 7, 6, 6, 7, 8, 7 | 13, 12, 13, 12 |
| 2023 | 8 | 5, 5, 6, 5, 7, 7, 7, 8 | 12, 12, 13, 13 |
| 2024 | 9 | 3, 5, 5, 5, 6, 6, 6, 7, 7 | 13, 12, 13, 12 |
| 2025 | 9 | 4, 5, 6, 3, 6, 5, 6, 7, 8 | 12, 13, 12, 13 |

**Generator default:** Section A = 8 questions summing to 50 (marks roughly rising 4 → 8); Section B = 4 questions of 12/13/12/13.

### Topic order by year

Section A is **not** in syllabus order, but it does cluster. A short-question opener is almost always **binomial or first-principles differentiation** (4–5 marks), and the closer is the heaviest: **a system of equations, a rates/geometry problem, or an induction/trig proof** (7–8 marks).

| Year | Section A (in order) | Section B (in order) |
|---|---|---|
| 2020 | binomial (Q1), first principles with surd (Q2), tan 3x identity (Q3), ∫sin²θ and volume (Q4), induction + sum (Q5), related rates (Q6), integrate then tangent/normal (Q7), matrices PM = MQ (Q8) | rational function curve + area (Q9), definite-integral substitution/parts (Q10), system with parameters (Q11), vectors (Q12) |
| 2021 | first principles (Q1), induction (Q2), binomial (Q3), sum-to-product trig (Q4), asymptote/inflexion claim (Q5), normal + area (Q6), by parts + volume (Q7), system (Q8) | sec θ integral + even/odd integral (Q9), optimisation + rates (Q10), matrices PAP⁻¹ (Q11), vectors/tetrahedron (Q12) |
| 2022 | first principles (Q1), trig identity (Q2), induction (Q3), inflexion claim (Q4), binomial reasoning (Q5), substitution integral (Q6), tangent area + rate (Q7), system (Q8) | rational function + volume (Q9), trig integral + substitution (Q10), matrix geometric series (Q11), vectors/incentre (Q12) |
| 2023 | binomial (Q1), first principles (Q2), integral by decomposition (Q3), cos 3x identity (Q4), matrix A²+A+I=0 (Q5), volume + related rate (Q6), tangent slope + integration (Q7), induction on trig sum (Q8) | f = x e^(−x²) (Q9), vectors/circle/plane (Q10), system with parameters (Q11), integral chain (Q12) |
| 2024 | vectors (Q1), first principles (Q2), binomial (Q3), trig identity (Q4), by parts (Q5), homogeneous system (Q6), implicit differentiation (Q7), induction (Q8), geometry + rates (Q9) | rational curve + area (Q10), integral substitution/symmetry (Q11), system + vectors (Q12), matrices (Q13) |
| 2025 | binomial (Q1), first principles (Q2), derivative of ln + curve (Q3), commuting matrices (Q4), induction (Q5), trig (Q6), matrix powers (Q7), rates (Q8), trig substitution + volume (Q9) | rational curve (Q10), by-parts / product-sum integral chain (Q11), system (Q12), vectors (Q13) |

### Section B: stable pattern (2020–2025)

Four long questions, always these four **strands**. The order within B varies, but each year has exactly one of each:
1. **A curve question** (curve sketching, extrema, asymptotes, inflexion, area or volume) — `M2-7`, `M2-8`, `M2-10`, `M2-11`. (2020 Q9, 2022 Q9, 2024 Q10, 2025 Q10; in 2021 Q10 and 2023 Q9 it is optimisation or `x e^(−x²)`.)
2. **An integration question** built as a staircase, each part feeding the next (2020 Q10, 2021 Q9, 2022 Q10, 2024 Q11, 2023 Q12, 2025 Q11) — `M2-9`, `M2-10`.
3. **An algebra question:** a 3×3 linear system with parameters (2020 Q11, 2023 Q11, 2025 Q12, 2024 Q12(a)) or a matrices question (2021 Q11, 2022 Q11, 2024 Q13) — `M2-12`–`M2-14`.
4. **A vectors question** in R³ (2020 Q12, 2021 Q12, 2022 Q12, 2023 Q10, 2024 Q12(b), 2025 Q13) — `M2-15`–`M2-17`.

Each year, algebra and vectors together usually take about a quarter of the paper, and calculus the rest. Induction appears **every year** in Section A (5–8 marks), always with a summation (2020 Q5, 2021 Q2, 2022 Q3, 2023 Q8, 2024 Q8, 2025 Q5). Binomial theorem appears in Section A **every year**. First-principles differentiation appears in Section A **every year** (2024 Q2, 2023 Q2, 2022 Q1, 2021 Q1, 2020 Q2, 2025 Q2).

---

## 2. Question anatomy and scaffolding

### Scaffolding patterns

| Pattern | What it looks like | Examples |
|---|---|---|
| **"Prove … hence …"** | A part (a) states an identity or integral as a **given result**; part (b) is only solvable by using it. The two parts together carry 5–8 marks. | M2 2025 Q2(a)(b); M2 2024 Q2; M2 2023 Q2(a)(b); M2 2022 Q1; M2 2020 Q3 |
| **"Prove (given form), then use a special case"** | An abstract integral or sum with a parameter is proved, then a numerical instance is evaluated. | M2 2025 Q5; M2 2024 Q5(a)(b); M2 2024 Q8(b); M2 2020 Q5(b) |
| **Staircase** (Section B integration) | 3–4 parts. (a) an integral in a parameter; (b) uses (a) or a sum-to-product identity; (c) a substitution reducing a disguised integral to (b). | M2 2025 Q11; M2 2023 Q12; M2 2024 Q11; M2 2020 Q10 |
| **Symmetry lemma** | Prove a general statement about odd/even or "g(x)+g(−x)=1" functions, then spot that a given integrand has this form. | M2 2024 Q11(b)(c); M2 2021 Q9(b)(c); M2 2022 Q10(c)(d) |
| **"Someone claims … Do you agree? Explain."** | A claim, usually false or subtly true. 2–4 marks. **Section A has at least one of these every year**, often as the last part of a 6–8 mark question. | See §2.3 |
| **Compute-then-interpret** | Find a parameter value or solution family, then test it against an extra condition ("satisfies … > 0 for all solutions"). | M2 2025 Q12(b)(ii); M2 2021 Q8(b); M2 2020 Q11(b); M2 2024 Q6(b) |
| **Parametric family with named result** | Define a general matrix or point and prove a formula, then specialise. | M2 2021 Q11 (PAP⁻¹); M2 2022 Q11 (rotation matrices); M2 2024 Q13 |

### Command words and typical marks

| Wording | Typical marks |
|---|---|
| "Find …", "Evaluate …", "Solve …" | 2–4 for a part; 1 for a substitution-in, 1 per method step |
| "Prove that …", "Using integration by substitution, prove that …" | 3–5. All the method is in the printed target; marks go to correct intermediate lines |
| "Using (a), find/evaluate …", "Hence …" | 3–6 |
| "Using mathematical induction, prove …" | 5 (Section A, with the follow-on "using (a), evaluate" adding 1–3) |
| "Find … from first principles" | 3–5 |
| "Explain your answer", "Do you agree?" | 2–4, usually 1 for the verdict and 1–2 for the justification |
| "Express … in terms of …", "Find the range of values of …" | 2–5 |
| "Sketch", "Find the area of the region bounded by …" | 3 (area) |

### Mark allocation norms

- **Section A:** 3–8 marks per question, with 1 mark per working step or per sub-result. A 4-mark first-principles question is 1 (set up limit) + 1 (algebra) + 1 (cancel h) + 1 (answer).
- **Section B parts:** 2–4 marks for routine parts, **6–9** for the main body (e.g. 2020 Q11(a) = 9 marks across five sub-sub-parts; 2021 Q12(a) = 9 marks across four).
- A **claim question** is rarely worth more than 4 marks.
- **Last-question parts (b),(c)** carry the unusual reasoning. In 2025 Q13 parts (c),(d) are 3 + 3 and (b) is 4.

---

## 3. Archetypes by topic

Each archetype has: the construction, the scaffold, mark range and a citation. IDs are `M2-<unit>` from m2.md.

### M2-2 Mathematical induction
- **I1 Telescoping/polynomial sum, then evaluate a middle range** (5–7 marks, **every year**). Prove Σ f(k) = closed form, then evaluate a sum from a to b by subtracting two closed-form values (S_b − S_{a−1}) — M2 2025 Q5 (alternating sign, k=10..60); M2 2022 Q3 (alternating, 11..100); M2 2021 Q2 (Σ(3k⁵+k³) = n³(n+1)³/2); M2 2020 Q5 (Σ1/(k(k+1)(k+2)), then Σ_{k=4}^{123}).
  - **Pitfall:** off-by-one: S_b − S_{a−1}, not S_b − S_a (2020 Q5(b)).
  - Alternating-sign sums need the induction step to combine (−1)^n and (−1)^{n+1} terms (2025 Q5, 2022 Q3).
- **I2 Trig sum** (8 marks, Section A last). Prove sinθ·Σ sin(2kθ) = sin(nθ)sin((n+1)θ), then use it with a specific θ and product-to-sum to compute a numerical sum — M2 2023 Q8.
- **I3 Weighted geometric sum** (7 marks). Σ r·2^(−r) = 2 − (n+2)2^(−n); part (b) uses it for a block of terms and then a reindexed variant (Σ(2000−r)2^r) — M2 2024 Q8.
- Syllabus note: proving inequalities by induction is *not* required (m2.md).

### M2-3 Binomial theorem
- **B1 Two unknowns from two coefficients** (4–6 marks). (1+mx)(1+5x)ⁿ with a₁, a₂ given → quadratic in n, **reject a non-integer or negative root** — M2 2025 Q1; M2 2021 Q3(a) (coefficient of x² = 240 → n² − n = 30, reject n = −5).
- **B2 Product of two expansions** (4–6 marks). (1+kx)⁹(1−x)⁴: expand the second fully, take only the terms needed from the first, solve a quadratic for k — M2 2020 Q1; M2 2021 Q3(b) ((1−4x)ⁿ(1+2/x)⁵, coefficient of x⁴); M2 2023 Q1.
- **B3 General term with a parameter in the exponent** (5 marks). (x^m − 2/x)^24 in descending powers: first 3 terms, then "19th term constant" → m; then coefficient of a given power — M2 2024 Q3.
- **B4 Reasoning from signs/parity** (6 marks). (a+x)ⁿ with a given coefficient of x²: explain why a < 0 and n is odd; then match two expansions to find a, b, n — M2 2022 Q5.
- **B5 Binomial as a tool for matrices** (inside a 6-mark question): (I+A)ⁿ = I + ΣC(n,k)Aᵏ when A commutes with I — M2 2025 Q7(b).

### M2-4 Trigonometric identities and equations
- **T1 Prove an identity by combining fractions, then solve** (5 marks). The proof reduces the expression to a + b·sec θ·csc θ (or similar); part (b) turns it into sin 2θ = c on a **restricted interval** — M2 2025 Q6 (sec+tan / csc−cot …, π/2 < x < 3π/4, pick 7π/12); M2 2022 Q2 (tanθ/(1−cotθ) + cotθ/(1−tanθ) = 1 + secθ cscθ, π/4 < θ < π/2).
- **T2 Multiple-angle identity then solve** (5–6 marks): prove cos 3x = 4cos³x − 3cos x, then solve a cubic in sec x (M2 2023 Q4); prove cos 2x + cos 4x + cos 6x = 4cos x cos 2x cos 3x − 1, then solve = −1 on [0, π/2] (M2 2021 Q4); prove csc 2x − cot 2x = tan x, then solve a product (M2 2024 Q4).
- **T3 Tan identity with exact-angle application** (6 marks): tan 3x = (3tan x − tan³x)/(1−3tan²x), tan x·tan(60°−x)·tan(60°+x) = tan 3x, then tan 55° tan 65° tan 75° = tan 85° — M2 2020 Q3.
- **Pitfalls:** spurious roots outside the stated interval (most solutions need rejecting; the candidate's script rejects out-of-range values in 2025 Q6, 2022 Q2, 2021 Q4); dividing out a factor that can be zero; forgetting the general expansions of sum-to-product.

### M2-5 and M2-6 Limits and first principles
- **L1 Surd function, rationalise** (3–5 marks): f(x) = x/√(2+x) at x = 2 — M2 2020 Q2; f(x) = 1/√(5x+4) with the "prove f(1+h) − f(1) = …" first step then the limit — M2 2022 Q1; limit (√(x+h) − √x)/h then e^√x from first principles — M2 2024 Q2.
- **L2 Rational function** (4 marks): f(x) = 1/(3x²+4), common denominator, cancel h — M2 2021 Q1.
- **L3 Trig function with a "prove" lead-in** (5 marks): f(x) = −x sin x or 2x/tan x at π/2 or π/4. Part (a): prove an expression for f(a+h) − f(a), using double angle or compound angle; part (b): divide by h and use sin h/h → 1 — M2 2023 Q2, M2 2025 Q2.
  - The (a) line is given, so (b) is "using (a)": one mark is the use of `sin(h/2)/(h/2) → 1` and one the final value.
- **Pitfalls:** writing the limit before the algebra; taking h → 0 too early; forgetting that (sin h)/h → 1 must be quoted as a standard limit.
- **Syllabus-wide note:** `M2-5` (the number e) is not tested directly; it appears through exponential/log integrals and derivatives.

### M2-7 and M2-8 Differentiation and its applications
- **D1 Implicit differentiation with a "claim" part** (6 marks): x²y + 2xy² + 8 = 0, find dy/dx; "two tangents parallel to a given line — agree?" Requires checking that the points actually lie on the curve — M2 2024 Q7. (The candidate stopped before checking intersection with the curve: a typical blind spot.)
- **D2 Derivative with ln/sqrt and recover the curve** (6 marks): d/dx ln(√(x⁴+9) − x²) = kx/√(x⁴+9), find k; then the curve with slope (4x³−x)/√(x⁴+9) through (2,5); does it pass (−2,5)? The slope is odd, so the curve is even, so yes — M2 2025 Q3.
- **D3 Tangent/normal chain** (7–8 marks): integrate f′(x) = −2x + 8 with a point to get Γ; tangent from an external point P(5,14) with negative slope; normal at the contact point — M2 2020 Q7. Also normal at (3,1) on y = e^(2x−6), x-intercept c, area bounded by L, Γ and x = c — M2 2021 Q6.
- **D4 Claim about turning/inflexion points** (6–7 marks): derivative of a rational/exponential function, then "someone claims two/one point(s) of inflexion — agree?" The correct answer needs a **sign change of f″** check, not just f″ = 0 — M2 2021 Q5(c) (candidate stopped at "f″ = 0 has one root", not showing sign change); M2 2022 Q4 (y = (7x−2x²)e^(−x)).
- **D5 Related rates, parametrised by a hidden function** (6–8 marks): area of a circle on diameter OP increases at 5π units²/s; S = u²+v² has constant rate? then area of △OPQ at u = 2 — M2 2020 Q6. Area of a quadrilateral under a parabola A(h), h = 3 − 2e^(−t), "rate of change of A has only one maximum — agree?" — M2 2025 Q8. Area under tangent line then dA/dt at t = 1 with h = 3^(−t) — M2 2022 Q7.
- **D6 Geometry optimisation + rate** (7–9 marks): minimise |PQ| between two curves; then "rectangle area is minimum at that u — agree?" and a perimeter rate — M2 2021 Q10. Angle θ between lines expressed as tanθ = 15t/(2(t²+25)), equate angles, differentiate implicitly for dθ/dt — M2 2024 Q9.
- **D7 Curve sketching package** (12–13 marks, Section B strand 1): asymptotes (vertical + oblique by polynomial division), derivative, increasing/decreasing, extrema, inflexion by f″, symmetry, then an area or volume. Examples: (x+4)³/(x−4)² (M2 2020 Q9); (x²+3x)/(x−1) (M2 2022 Q9); 2(x+2)²/(2x²+6x+5) (M2 2024 Q10); (x³+25x)/(x²+3) (M2 2025 Q10: "is f increasing?" by showing numerator = (x²−8)² + 11 > 0; "explain why rotational symmetry about the origin" = f is odd; inflexion at x = 0, ±3; area between G and the line through them); x e^(−x²) (M2 2023 Q9: tangent at (1, 1/e), explain with f″ why G lies below L on (0,1), area bounded by G, L, y-axis).
- **Pitfalls:** oblique asymptote needs division (not x → ∞ limit by hand-waving); candidates forget to test sign change of f″; area problems need the sign of integrand (2025 Q10(e): candidate integrated a signed odd function and got 0, instead of 2 × area).

### M2-9 and M2-10 Integration (indefinite and definite)
- **N1 Decomposition of numerator** (6 marks): find p, q with 11 sin x + 7 cos x ≡ p(3 sin x + cos x) + q(3 cos x − sin x), then integrate the quotient: the answer is p·(upper − lower) + q·ln(denominator ratio) — M2 2023 Q3.
- **N2 Substitution with trig** (6–8 marks): x = tan θ for 1/(1+x²)² (M2 2025 Q9(a)); x = sin θ in x²√(1−x²) (M2 2020 Q4); x = 2 sin θ for (k−3x)/√(4−x²) (M2 2023 Q7(a)). Expect a result with an arctan/arcsin term plus an algebraic term; the integral to be proved is always printed.
- **N3 By parts, once and twice** (3–6 marks): ∫cos(k ln x)dx (M2 2024 Q5(a)); ∫(ln x)² dx (M2 2021 Q7(a)); ∫e^(−x) sin 2mx dx — two parts then "solve for the integral" (M2 2025 Q11(a)); ∫x²e^(ax)dx on [0,1] (M2 2023 Q12(a)).
- **N4 Staircase with product-to-sum** (6 marks): e^(−x) sin 5x cos 3x on [0, π], then [0, 2π] by substitution x = π − u (or a periodicity argument) — M2 2025 Q11(b); then (c) disguise by ln x substitution — M2 2025 Q11(c).
- **N5 Symmetry** (3–5 marks): ∫_{−a}^{a} g h dx = ∫_0^a h dx for g(x) + g(−x) = 1 and h even; apply to 3^x x²/((3^x+3^(−x))√(x²+1)) — M2 2021 Q9; the analogue with e^(sin³x) in the denominator — M2 2024 Q11.
- **N6 King-property definite integrals** (6–7 marks): ∫ ln(sin(π/4 − x))dx = ∫ ln(sin x) dx by substitution; ln(cot x − 1) rewritten via the compound angle formula; then x csc²x/(cot x − 1) by parts — M2 2020 Q10. Also ∫ x g(x) dx over [0,π] with g periodic of period π and the "x → π − x" trick — M2 2022 Q10(c)(d).
- **N7 Sec³ by parts or via sec θ + tan θ** (4 marks): d/dθ ln(sec θ + tan θ) = sec θ, hence ∫sec θ dθ and ∫sec³θ dθ — M2 2021 Q9(a).
- **Pitfalls:** forgetting to change limits when substituting (2021 Q9(c)'s candidate did it); dropping + C in indefinite integrals; sign errors in two-step by parts; not recognising the "n-th disguise" of the earlier part in a staircase.

### M2-11 Area and volume of revolution
- **V1 Disc method with a trig substitution** (6–8 marks): π∫y² dx for y = 4x(1−x²)^(1/4) (2020 Q4), y = 1/(1+3x²) bounded by x = 1 and the axes (2025 Q9(b), uses the given result of (a)), y = √x ln(x²+1) (2021 Q7(b), substitution u = x²+1 then by parts).
- **V2 Volume of a spherical cap or liquid-in-container problem** (7 marks): prove V = πh²(3r − h)/3 by revolving a circle about the y-axis; then a related-rates question about the water depth in a cylinder — M2 2023 Q6.
- **V3 Area between a curve and its tangent/normal/line** (3–7 marks): M2 2021 Q6(b), M2 2022 Q7, M2 2023 Q9(c)(iii), M2 2020 Q9(e), M2 2025 Q10(e).

### M2-12 and M2-13 Matrices and determinants
- **MA1 Find a parameter so two matrices commute** (3 marks): CD = DC gives a quadratic; **substitute back to check all four entries** (some roots fail) — M2 2025 Q4.
- **MA2 A² + A + I = 0 type** (7 marks): show A³ = I; show A is non-singular; evaluate a mixed expression (A¹⁰⁰⁰ + (A⁻¹)²⁰⁰⁰)⁻¹ in the form αI + βA, using powers mod 3 — M2 2023 Q5.
- **MA3 Nilpotent shift: A = B − I** (6 marks): A³, Aⁿ in terms of n, then Bⁿ = I + ΣC(n,k)Aᵏ; "does there exist m with A^m − B^m singular?" (an open-ended existence question) — M2 2025 Q7.
- **MA4 Conjugation and diagonalisation** (12–13 marks, Section B): PAP⁻¹ for a rotation-like P, then PBP⁻¹ = diag(λ, μ), then Bⁿ = P⁻¹ diag(λⁿ, μⁿ) P (2021 Q11); B = [[4,2],[1,5]] with eigen-matrix A, A − 6A⁻¹ = 0, Bⁿ, and a closing "does there exist k" and A⁹⁹B⁹⁹(A⁻¹)⁹⁹ — M2 2024 Q13.
- **MA5 Prove a matrix identity from a proved series** (13 marks): (I−A)(I+…+Aⁿ) = I − Aⁿ⁺¹; with A a rotation by θ, (I−A)⁻¹ in closed form, and I + A + … + Aⁿ = [sin((n+1)θ/2)/sin(θ/2)] × (rotation by nθ/2); then evaluate cos-sum and cos²-sum by reading an entry of the matrix — M2 2022 Q11.
- **MA6 Given PM = MQ with |M| = 1** (8 marks): solve for entries a, b, c, evaluate M⁻¹RM, and prove (αP + βR)⁹⁹ = α⁹⁹P + β⁹⁹R (needs P, R as M·diag·M⁻¹ so cross terms vanish; the candidate's working in 2020 Q8(b)(ii) is incomplete) — M2 2020 Q8.

### M2-14 Systems of linear equations
- **S1 3×3 with two parameters, three scenarios** (7–13 marks). Unique solution → condition on a parameter from det ≠ 0; express one variable by Cramer's rule; infinitely many solutions with a restriction → solve with a free parameter; then a **test condition on all solutions** — M2 2025 Q12 (kx + y + 4kz² > 0 for all solutions, discriminant on a quadratic in t); M2 2020 Q11 (unique ⇒ h ≠ −3 [det = −(h+3)²], consistent only if k = −2 at h = −3; then F: "at least two values of h such that …3x²+4y²−7z² = 1"); M2 2023 Q11 (consistent/inconsistent by range of b; then a claim about "real m, n independent of s").
- **S2 Family with a free parameter and "claim"** (6–8 marks): M2 2021 Q8 (infinitely many solutions when d = 3 or −11 → inspect each; then "∃ solution with xy + 2xz = 3?" gives a quadratic with negative discriminant); M2 2024 Q6 (2 equations, homogeneous: param solution z = t; claim "unique solution of sin x + cos y − cos z = 0 with 0 < z < π/2" — compound angle yields no solution/sin 2t = 0).
- **S3 With vectors** (M2 2024 Q12(b), 7 marks): a vector v perpendicular to two given vectors with u × v prescribed; leads to a determinant system; closes with an existence question on the area of a parallelogram.
- **Pitfalls:** when det = 0 you must test consistency separately for each root (2021 Q8: d = −11 gives an inconsistent system); a unique solution requires det ≠ 0 and gives a **range** (union of intervals), not a single inequality.

### M2-15, M2-16 and M2-17 Vectors
- **VE1 Collinearity from equality in the triangle inequality** (3 marks, Section A opener): |OB| = |OA| + |AB| ⇒ A lies on segment OB; find AB with a **positive** scalar multiple — M2 2024 Q1.
- **VE2 Plane geometry package** (12–13 marks): AB × AC (3), area of triangle (2), volume of tetrahedron by scalar triple product (3), distance from a point to the plane (2), then a "Is E the circumcentre of △ABC? Explain" — M2 2021 Q12; M2 2025 Q13 (AB × AC, projection E of D onto Π via ED = (AD·n̂)n̂, ratio BF : FC = 1 : t by a vector equation, pyramid volume); M2 2020 Q12 (OP × OR, area of quadrilateral, "is NR ⊥ PQ?", angle between two triangle planes).
- **VE3 Circle through O, P, Q with ratio points** (12 marks): M2 2023 Q10 (R on PQ with OR ⊥ OQ, OR meets the circle at S, plane normal, projection of A onto Π, "relationship between O, B, G" = collinear).
- **VE4 Angle bisector and incentre** (12 marks): prove AD = −OA + (b/(b+c))OB + (c/(b+c))OC from BD : DC = c : b; prove J = (aOA+bOB+cOC)/(a+b+c) lies on AD (hence on BE too), then compute the incentre and the incircle radius via |AI × AB| — M2 2022 Q12.
- **Pitfalls:** unit/coordinate bookkeeping in projections; the ratio (BF : FC = 1 : t) must be set up as a vector equation with correct direction; the cross product magnitude (twice the triangle area) gets halved incorrectly.

### Syllabus coverage not seen in these six papers
No question was seen on: odd/even functions as a stand-alone item (`M2-1`; it appears only inside symmetry integrals), the definition of e (`M2-5`), definite integral as a limit of a sum (`M2-10.1`), Gaussian elimination as a named "method" requirement (it is used, not named), direction cosines, and inverse-trig principal values beyond arcsin/arctan answers. Generators should stay within the archetypes above.

---

## 4. Marking conventions visible from the scripts (*inferred*)

The scripts show only answers, not mark tags. The following is inferred from the mark split per part and from general HKDSE Maths practice. **Please confirm against an official marking scheme before relying on it.**
- **Mark types (inferred):** M = method, A = accuracy; "f.t." = follow-through; `pp` = presentation penalty (not applied to sample scripts).
- **"Prove / show that":** the final step should reach the printed target. The candidate scripts write one line per identity substitution and put "= RHS" at the end (e.g. M2 2025 Q2(a), M2 2023 Q2(a)). A proof that begins from the result earns nothing.
- **"Using (a)/Hence":** the method mark is for **using** the printed result. A solution that ignores (a) and recomputes from scratch is awarded only partly in the typical scheme. This is why the generator must make (b) *not* reasonable to do without (a) (see §5).
- **Induction layout** (visible in M2 2025 Q5, M2 2021 Q2, M2 2020 Q5): base case with both sides evaluated; "assume P(k) is true"; algebraic step; "P(k+1) is true"; final statement "By the principle of mathematical induction, P(n) is true for all positive integers n". The scripts always include the closing sentence.
- **Root rejection:** the scripts write "(rej.)" next to every discarded root (M2 2025 Q1, 2022 Q2, 2020 Q7(b)(i), 2024 Q1). A missing reason is a typical lost mark.
- **Exact answers** are expected (surds, π, ln): no decimals appear in correct scripts except the one for the incentre coordinates (M2 2022 Q12(b), where decimal approximations are used and are weaker).
- **"Explain" questions:** a verdict plus a mathematical reason (a computed value, a sign table or a discriminant). A bare "Yes/No" earns nothing; a verdict with an arithmetic error in the reasoning loses the A mark only.
- **Candidate errors that a marker would catch (useful trap list):**
  - M2 2025 Q8(b): concluded "no" after showing dA/dt > 0 for all t; the claim concerns maxima of the **rate** (dA/dt), so one must differentiate dA/dt again.
  - M2 2025 Q10(e): integral of an odd function = 0 is not the area.
  - M2 2021 Q5(c): f″ = 0 only at x = 4, but the answer should state the sign change.
  - M2 2020 Q8(b)(ii): the proof that cross terms vanish is thin (it shows only that R⁹⁹ = R); a full proof needs P = M·diag(1,0)·M⁻¹ style factorisation.

---

## 5. Typical traps (for distractor-like design and the hardest 20%)

- **Hidden restrictions:** interval for x in trig equations; n a positive integer (reject fractions); x ≠ pole; "for all x ∈ ℝ" vs "for x > 0".
- **A quadratic with two roots where one fails a later test:** commuting matrices (2025 Q4), n from binomial (2025 Q1, 2021 Q3), tangent from an external point (2020 Q7), d from det = 0 (2021 Q8).
- **A claim that is true only because of symmetry:** the curve through (−2, 5) given an odd slope (2025 Q3(b)); rotational symmetry from oddness (2025 Q10(c)).
- **A claim that is false because of a global condition:** no stationary point in a rate-of-change question (2025 Q8(b)); "unique solution" when the family is a line (2024 Q6(b)); no real solution since the discriminant is negative (2021 Q8(b)).
- **A claim whose proof needs a side check:** parallel tangents need the intersection points to lie on the curve (2024 Q7(b)); the point of inflexion needs a sign change (2021 Q5, 2022 Q4).
- **Disguised repeats:** e^(−x) sin 5x cos 3x is a sum of two exponential-trig integrals, which is the printed form of (a); a ln-x substitution turns cos(ln x⁵) sin(ln x³)/x into the same family (2025 Q11).
- **Off-by-one in sums:** S_b − S_{a−1} (2025 Q5(b), 2022 Q3(b), 2020 Q5(b)).
- **Unit/limit slips in substitutions:** changing limits (2025 Q10(e), 2021 Q9(c)).
- **Matrix noncommutativity:** (A+B)² ≠ A² + 2AB + B² unless AB = BA; binomial used only after A commutes with I.

---

## 6. Generator recipe (summary)

1. **Blueprint.** Build a paper from the §1 default: Section A = 8 questions (4–8 marks, rising) totalling 50, Section B = 4 questions (12/13/12/13) totalling 50. Include one of each: curve (Q9/10), integration staircase, algebra (system or matrices), vectors in R³.
2. **Section A slots (pick 8):**
   - 1 binomial (B1 or B2);
   - 1 first-principles with a "prove" lead-in (L1/L3);
   - 1 induction (I1 or I2 or I3), with the follow-on evaluation;
   - 1 trig identity + equation on a restricted interval (T1/T2);
   - 1 differentiation application with a claim (D1/D4/D5);
   - 1 integration (N1–N3) or area/volume (V1);
   - 1 matrices or system (MA1–MA3, S2);
   - 1 closer of 7–8 marks (rates, system, trig-sum induction).
3. **Section B slots:** curve package D7, staircase N4/N5/N6, S1 or MA4/MA5, VE2/VE3/VE4. Give each Section B question one "claim" part or "does there exist" part.
4. **Per item:**
   - pick an archetype and clean parameters (integer roots; the discriminant a perfect square when rational answers are intended; angles in the π/12 family);
   - write the printed target for each "prove" part **first**, then work backwards to the unlabelled marks;
   - decide whether (b) must really use (a): choose (b) so that direct computation is clearly longer;
   - place one trap from §5;
   - record the intended M/A allocation per step (inferred notation).
5. **Marking scheme:** one line per M/A mark, with the "reject" step flagged, an f.t. flag where a later part uses an earlier answer, and an exact answer. Open-ended "does there exist" parts need an intended verdict and justification.
6. **Verification (see below).** Numeric/symbolic answers go through the checker; proofs and explanations go to a teacher.

### Verification notes: what a random-point checker can and cannot do

**Checkable by evaluation at random points (mathjs or similar):**
- **Identity targets** in "prove that" trig and algebra parts: evaluate LHS − RHS at 10–20 random points (avoid poles), tolerance ~1e-9. This verifies M2 2025 Q2(a), 2025 Q6(a), 2022 Q2(a), 2021 Q4(a), 2020 Q3, 2023 Q4(a), 2024 Q4(a), 2022 Q1(a), and matrix identities of the PAP⁻¹ type (M2 2021 Q11(a)). It cannot check that the *steps* are valid.
- **First-principles results**: compare the claimed f′(a) with a numerical difference quotient (h = 1e-6) and with a symbolic derivative.
- **Derivatives:** compare symbolic derivatives with central differences at random points. Includes D1–D4 and implicit derivatives (check F(x, y) = 0 consistency at points found by solving numerically).
- **Integrals:** definite integrals by adaptive quadrature against the closed form (N1–N7, V1, V3). Indefinite integrals: differentiate the claimed antiderivative and compare with the integrand at random points. Volumes by quadrature of πy².
- **Binomial coefficients:** expand with exact polynomial arithmetic (rational numbers) and compare coefficients.
- **Sums for induction:** evaluate LHS and RHS for n = 1…30 with exact integers or rationals (this checks the statement; it does not check the induction proof).
- **Matrix/system/vector items:** evaluate with exact rational arithmetic: determinants, inverses, Aⁿ for small n (and the closed form), solutions by substitution into every equation, cross products, scalar triple products, distances, projections.
- **Root rejection items** (restricted interval, integer n, non-singular conditions): enumerate candidate roots exactly and filter, then confirm the list against the printed answer.
- **Parameter ranges** (unique-solution and "for all solutions" conditions): sample the parameter on a grid and confirm sign/determinant behaviour consistent with the stated interval; confirm endpoints separately.

**Needs a teacher's review (not reliably automatable):**
- Whether an **induction proof** is logically complete (base case, hypothesis, step, conclusion).
- **"Do you agree? Explain"** and **"does there exist"** parts: the checker can verify the *verdict* numerically (e.g., search for a counterexample), but the written reason (sign change of f″, discriminant, symmetry argument) needs human review. Parts like M2 2025 Q7(c), M2 2023 Q11(b), M2 2021 Q10(b)(i) require a proof of non-existence or non-minimality.
- **"Prove that" with substitution** (N2, N5, N6): the step-by-step validity (including limits change) is a proof.
- **Vector geometric claims** such as "E is the circumcentre", "O, B, G are collinear" — the verdict can be checked with coordinates; the explanation requires review.
- The wording: does each part's marks match the work? Does (b) really use (a)?
- Alternative acceptable methods: more than one route can be correct; a model solution should note these.

---

## 7. Common weaknesses → feedback tags (inferred from candidate scripts only)

No examiners' report for M2 was available, so these tags come from slips seen in the Level 5 scripts; **flagged inferred**. Use them as error tags (`m2.*`) in a student's weakness profile.

| Tag | Seen as |
|---|---|
| `m2.root_rejection` | quadratic roots not tested against a condition (n integer, interval, matrix equality all entries) — 2025 Q1, Q4; 2022 Q2 |
| `m2.claim_reasoning` | verdict without the key check: sign change of f″ (2021 Q5), side check of a point (2024 Q7), maxima of the rate vs the rate (2025 Q8) |
| `m2.integration_limits` | substitution without changing limits; signed vs unsigned area (2025 Q10(e)) |
| `m2.hence_not_used` | recomputing instead of using (a) |
| `m2.induction_structure` | missing base case/conclusion; wrong index in the step |
| `m2.sum_range` | S_b − S_a instead of S_b − S_{a−1} |
| `m2.first_principles` | applying the derivative rule instead of the limit definition; dropping h too early |
| `m2.matrix_powers` | applying scalar rules (A+B)ⁿ without commutation; wrong diagonalisation order (M⁻¹RM vs MRM⁻¹) |
| `m2.system_consistency` | not testing consistency when det = 0; stating a range wrongly |
| `m2.vector_geometry` | wrong ratio direction, missing ½ in area, projection formula |
