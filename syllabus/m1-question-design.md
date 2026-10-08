# HKDSE Mathematics Extended Part Module 1 (Calculus and Statistics) — how the questions are built

Status: **draft v0.1 (2026-10-07), awaiting review by a Maths teacher.**

These notes are distilled from the HKEAA "Level 5 candidate" Question-Answer Books in `paper/math/m1/` (unofficial mirror copies, git-ignored):
- **2022, 2023, 2024, 2025:** every question read in full, with the candidate's working.
- **2021:** Q1–Q12 read (Q9(c), Q10(e), Q12(c)(ii) only partly legible or cut off).
- **2020:** Q1–Q12 read; Q10(c)–(d), Q11(b) and Q12(b)(iv) were skimmed.
- The 2022+ files contain two exemplars of the same paper. We read one exemplar per year.

Citations look like `M1 2023 Q5` (2023, Module 1, Q5). Topic IDs from `syllabus/m1.md` were **not** added: that file did not exist when this was written. Topics are named in words, so a later pass can tag them `M1-<unit>`.

Caveats:
- **The candidate scripts are unofficial reference solutions, not marking schemes.** We checked what we could and found several script errors, which we list in §6. Treat every "answer" in this file as unofficial until a teacher or the HKEAA marking scheme confirms it.
- **The scripts carry teacher or marker annotations** (ticks, circled parts, re-written numbers). We read the printed questions as the authority.
- **Marks per part are inferred** from the bracketed total at the end of each question and the printed part marks. Where a part mark is not printed, we say so.
- **Question wording is paraphrased.** No question is copied whole.

---

## 1. Paper blueprint

### Format (stable 2020–2025)
- **2½ hours** (8:30–11:00 am), written in the Question-Answer Book, in English. There are two sections.
- **Section A (50 marks): Q1–Q8, short questions of 5–8 marks.** Section B (50 marks): **Q9–Q12, long questions of 11–14 marks.** Everything is compulsory (100 marks, 12 questions).
- **Cover instructions (all years):**
  - Unless otherwise specified, **all working must be clearly shown.**
  - Unless otherwise specified, **numerical answers must be exact or given to 4 decimal places.**
  - Answers in the margins are not marked.
  - Graph paper and extra sheets are supplied on request.
- **The only formula aid is a Standard Normal Distribution Table** on the last printed page. It gives A(z) = the area under the standard normal curve between 0 and z, for z = 0.00 to 3.59 in steps of 0.01, to 4 d.p. Negative z comes from symmetry. Some questions give a formula inline, for example the sample standard deviation s in `M1 2025 Q3` and `M1 2024 Q4`.
- **The question books are long on purpose.** Each question has a ruled answer box of about a page, followed by blank continuation pages.

### Topic order by year (Section A, then Section B)

| Q | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|---|
| 1 | Discrete r.v. with unknowns, Var of linear form (6) | Discrete r.v. table + conditional P (6) | Discrete r.v. table, E and Var, CLT on mean (7) | Discrete r.v. table, Var as a function of n (6) | Discrete r.v. table with a quadratic, independence (7) | Discrete pf kx³/3ˣ, mean/variance of sample mean (7) |
| 2 | Binomial, expected waiting count (6) | Total probability and Bayes (disease test) (6) | E/Var transform, "possible?" Poisson/binomial (5) | Poisson, sample mean of an hour (CLT) (5) | Two-way table, conditional (6) | Binomial p, Var(3Y−1) (5) |
| 3 | Events: conditional, P(A∪B) (7) | Binomial with a knows/guesses model, conditional (7) | Events: prove, independence, mutually exclusive (7) | Tunnel/payment tree, Bayes (7) | Binomial, ratio of probabilities (6) | CI from a given interval, combine two samples (7) |
| 4 | CI for proportion, β% from width (6) | CI for proportion, minimum sample size (6) | CI for a mean, "wider or narrower?" (5) | Events: find P(A), independence, exclusive (6) | CI width and β; combine samples (6) | Events: inequality for P(A), independence, exclusive (6) |
| 5 | Expansion of (1+keˣ)³, coefficient (6) | Differentiation of e^(−x^(1/3)) trick, area (6) | Expansion of e^(−kx/2), linear form ln y (6) | Expansion of e^(2x), (1−ax)⁴+3e^(2x), chain rule (7) | Mixed binomial + e^(−nx) expansion (7) | Differentiation f = x·e^(1/(x−2)), horizontal tangents (5) |
| 6 | g = x+5/x+ln x⁴: extrema, "agree?" (6) | Expansion e^(−6x)(1−kx²)⁵ (5) | Quotient rule, tangent from outside point (7) | Exponential model A = Pe^(rt/100), ln-linear (6) | Log differentiation, tangent (7) | Expansion e^(−kx/3) and ln-linear (6) |
| 7 | Cylinder/cone optimisation (6) | Quotient rule, extrema on [0,5] (7) | Integration, β from g'(9)=2g'(4) (6) | Area under ((ln x)²−3 ln x+2)/x (6) | Related rates, constant diagonal (4) | By considering d/dx(x^(m+1) ln x), area (6) |
| 8 | By considering d/dx(xe^(mx)), area (7) | f' given, tangent line, find k and f (7) | Max/min proofs, find a (7) | Differentiation of x^(2/3)(x+2)^(1/3), trapezoidal over/under (7) | Normal table in an integral, area (7) | Cubic with extrema, "agree?" (8) |
| 9 | Normal, two buses, binomial on top (13) | Normal, small/medium/big, binomial (11) | Normal + Poisson, newborn weights (12) | CI for normal mean from grouped data, α from an upper limit (13) | Normal, grading, expected price, multinomial (11) | Poisson two companies, sums (12) |
| 10 | Dice coupon, Poisson prize (12) | Poisson emails, conditional (14) | Normal, 48 athletes, order statistics (14) | Poisson, "busy" telephonists, binomial (12) | Poisson delays, conditional (12) | Normal, exact μ and σ, binomial of binomial (12) |
| 11 | Trapezoidal rule, ln model, "agree?" (12) | f = (x/(2−x))^(1/2): f', f'', trapezoidal + convexity (11) | Trapezoidal e^x ln x, by considering, "agree?" (13) | g = x³/(1+x⁶): extrema, greatest slope (12) | Rainfall model, trapezoidal, "agree?" (14) | Population model, trapezoidal, P'' (14) |
| 12 | Duck population P = 32/(a^(5+bt)+8) (13) | Rainfall tank, cone, related rates (14) | Software bugs N = Ae^(−u), u = e^(6−2t) (11) | Substitution identity, t⁴+1 factorisation, W'(t) limit (13) | Online shop revenue and profit (13) | Rectangle perimeter, s = 2/v+2v (12) |

(Marks per question are in brackets. Where a cell is partly inferred, it is rounded to the nearest topic label.)

### Section-level pattern (generator defaults)
- **Section A (8 questions, 50 marks):**
  - **Stats and probability: 3–4 questions.**
    - Q1 is always a **discrete random variable table with unknown constants** (6–7 marks).
    - Q2–Q4 are a mix of events, binomial, Poisson, CLT, confidence intervals, or conditional probability.
  - **Calculus and exponentials: Q5–Q8.**
    - Q5 or Q6 is **a binomial or exponential expansion** (the "ascending powers of x" pattern), in 5 of the 6 years; 2021 has it as Q6, 2020 as Q5, and 2025 as Q6.
    - Q6–Q8 are **differentiation or integration** with proofs or "agree?" judgements.
    - Q7 or Q8 usually includes the "**by considering d/dx(...)**" integration trick (2020 Q8, 2023 Q7, 2024 Q8, 2025 Q7).
- **Section B (4 questions, 50 marks):**
  - **Q9–Q10 are statistics** (normal, Poisson, binomial, CI), 11–14 marks each.
  - **Q11–Q12 are calculus modelling** (trapezoidal rule, exponential/log growth models, optimisation, limits), 11–14 marks each.
  - **Exception to note:** in 2025 and 2021, Q10 still sits in statistics.
- **Part counts:** Section A: 2–4 parts; Section B: 3–6 parts. A long Q12 can have up to 7 lettered/numbered parts (`M1 2020 Q12`).
- **Mark mix, estimated across the six years:** about 55% calculus, about 45% statistics and probability.
- **Calculus is split roughly into:** differentiation and applications 35%, exponential/log expansions and models 25%, integration and area 25%, trapezoidal rule and numerical estimates 10%, limits 5%.

---

## 2. Per-question inventory (recent four years in detail)

### 2025
| Q | Marks | Topic | Parts | Context |
|---|---|---|---|---|
| 1 | 7 | Discrete r.v. | (a) find k from Σp = 1 for P(X=x) = kx³/3ˣ on x = 1, 3, 9; (b) mean and variance of the sample mean of 100 observations | pure |
| 2 | 5 | Binomial + variance of a linear form | find p from P(Y=0) = 0.027; Var(3Y−1) | pure |
| 3 | 7 | CI for a mean, combined samples | (a) recover s from a printed CI and n; (b) combine with a second sample; 90% CI | pure; hint formula for s |
| 4 | 6 | Events | (a) range of P(A) from two inequalities; (b) mutually exclusive? explain; (c) P(A) = 0.25 and independent → P(A∪B) | pure |
| 5 | 5 | Differentiation | (a) f' of x·e^(1/(x−2)); (b) "only one horizontal tangent?" explain | pure; claim-judging |
| 6 | 6 | Exponential expansion, ln-linear | (a) expansion of e^(−kx/3); (b) coefficient condition → k; (ii) intercept of ln y | pure |
| 7 | 6 | Integration | (a) by considering d/dx(x^(m+1) ln x); (b) area = given expression → m | pure |
| 8 | 8 | Extrema of a cubic with parameters | (a) c = 0; (b) y-intercept and product ab; (i) "two possible a?" judge; (ii) other extreme point | pure |
| 9 | 12 | Poisson | (a) λ from a ratio P(3):P(6); (b) P(>2); (c) company B independent, sums: P(total = 1), P(total ≥ 3), conditional | tech companies / events |
| 10 | 12 | Normal + binomial + conditional | (a) exact μ and σ from two table probabilities; (b) P(2<W<2.72); (c) 7 days, ordinary day, Peter visits; (i) binomial of binomial; (ii) P(ordinary \| visit) with a claim | weather/visit |
| 11 | 14 | Trapezoidal + exponential model | (a) trapezoidal with 4 sub-intervals of ∫ln(5ᵗ+1); (b) P''(t) → P'(t) by substitution; (ii) change over 2027–2030; (iii) "exceed 1.7 million?" by concavity | population/years |
| 12 | 12 | Optimisation / related quantity | (a) ds/dv for s = 2/v + 2v; (b) v(t) minimum, exact T, claim about s, rate of change at 3T | rectangle area 1 m² |

### 2024
| Q | Marks | Topic | Parts | Context |
|---|---|---|---|---|
| 1 | 7 | Discrete r.v. with a quadratic | find a from Σp, then b from Var(5X) = 739 (reject out-of-range root); independence of C and D; greatest P(E) with E exclusive of C | pure |
| 2 | 6 | Conditional probability | P(female \| no glasses), then joint | orchestra, glasses |
| 3 | 6 | Binomial | ratio P(1 tail) : P(3 tails) = 49 : 57 → quadratic in p; least k with P(≥1 tail) > 0.85 | coin |
| 4 | 6 | CI | (a) width given → β; (b) combined samples, find s of second | boys/girls sample |
| 5 | 7 | Binomial + exponential expansion | (a) 2/e^(nx) to x³; (b) (1+4x)^m + 2/e^(nx), coefficients of x and x² → m, n; coefficient of x³ | pure |
| 6 | 7 | Log differentiation | (a)(i) write e^u = (x²+x+e)^(2x+1) as u = p ln q; (ii) differentiate; (b) tangent at the y-intercept | pure |
| 7 | 4 | Related rates | picture with constant diagonal, breadth decreasing at 0.5 cm/s | rectangle, 15–20–25 triple |
| 8 | 7 | Normal table inside an integral | (a) ∫₀^0.5 e^(−x²/2)dx via A(0.5); (b) area bounded by (2x−1)e^(−x²/2) | pure |
| 9 | 11 | Normal, grading | (a) exact μ, σ from two percentages; (b) sample mean of 16 ≤ 5.4; (c) grades with prices, expected total price; P(≥5 B and ≥1 A) | pumpkins |
| 10 | 12 | Poisson, conditional | (a) P(smooth day: fewer than 3 delays); (b) 7 smooth days; (c) given all smooth, P(total 10 delays); (d) given ≥2 delay-free days, P(all smooth) | train delays |
| 11 | 14 | Exponential model + trapezoidal | (a) ln(P/q(t)) linear; (b) exact a, b; (c) trapezoidal rainfall; (d)(i) ∫Q; (ii) "sum > 160?" judge using concavity | rainfall, hours since 7 am |
| 12 | 13 | Rate of change, limit | (a) "greatest rate exceeds 4?" via second derivative; (b)(i) total profit over 12 months; (ii) estimate long-run rate | online shop |

### 2023
| Q | Marks | Topic | Parts | Context |
|---|---|---|---|---|
| 1 | 6 | Discrete r.v. | find k, Var(X) as a function of n; solve for integer n; Var(10X²−9) | pure |
| 2 | 5 | Poisson mean per hour + CLT | E and Var for an hour; least n for P(178 ≤ x̄ ≤ 182) > 0.733 using the table | customers, 3 per minute |
| 3 | 7 | Bayes with a two-way structure | joint, P(E \| Y), P(Y \| cash) | tunnels and payment method |
| 4 | 6 | Events | (a) P(A) from P(B \| A') and P(A∪B); (b) independence; mutually exclusive? | pure |
| 5 | 7 | Expansion + chain rule | (a) e^(2x); (b)(i) a from coefficient −1368 (a³ = 343); (ii) dy/du with x = 2^u at u = 0 | pure |
| 6 | 6 | Exponential model | (a) ln A linear; (b)(i) exact t when A = 2P; (ii) rate of change at that time | bank interest |
| 7 | 6 | Integration, area with sign change | x-intercepts in terms of e; area between x = 1 and 9 (split at the intercepts, sub u = ln x) | pure |
| 8 | 7 | Differentiation + trapezoidal | (a) f' = (Ax+B)/(3x^(1/3)(x+2)^(2/3)); (b) f''; (c) trapezoidal, over or under? | pure |
| 9 | 13 | Normal CI | (a) 98.5% CI from a grouped frequency table; (b) combine samples, find α given upper limit; (c) P(X>60), then conditional on "≥3 insufficiently protected" | antibody levels |
| 10 | 12 | Poisson + binomial | (a) P(busy); (b) P(no more than 3 busy of 20); (c) exactly 3 busy and total calls 15; (d) given ≤3 busy | hotline telephonists |
| 11 | 12 | Extrema | g = x³/(1+x⁶): g' = 0; "extreme at 0?"; greatest/least; greatest tangent slope on (0,1) | pure |
| 12 | 13 | Substitution + limit | (a) du/dt with p(t); (b) integrate (t²−1)/(t⁴+1) using the identity; (c)(i) change in weight; (ii) weight after a very long time | weight of a substance |

### 2022
| Q | Marks | Topic | Parts | Context |
|---|---|---|---|---|
| 1 | 7 | Discrete r.v. + CLT | a, b from Σp and E(X); Var; P(x̄ > 4.75) for n = 225 using the table | pure |
| 2 | 5 | E/Var transform + "possible?" | Var(X), E(Y); Y Poisson? X binomial? | pure |
| 3 | 7 | Events | prove P(A) = p/3 + 0.45; independent?; mutually exclusive with C? | pure |
| 4 | 5 | CI | 95% CI for μ; "wider, equal or narrower after deleting data?" | time on an online exercise |
| 5 | 6 | Expansion + ln-linear | e^(−kx/2); y = 64e^(−kx): ln y linear; coefficient of x² in √y(1−2x)⁵ = 449 → slope | pure |
| 6 | 7 | Quotient rule + tangent | dy/dx; tangent through (3, −2) | pure |
| 7 | 6 | Integration | prove β = −1/2 from g'(9) = 2g'(4); exact g(9) with u = √x | pure |
| 8 | 7 | Extrema proofs | f max at x = 0; prove a = 5; least value | pure |
| 9 | 12 | Normal + Poisson | (a) P(>3.7 kg); (b) P(boy \| >3.7); (c) Poisson mean 2.1 births per day: exact 2 and none heavy; conditional on ≤2 babies; "probability lower than 0.2?" | hospital newborns |
| 10 | 14 | Normal + binomial + order statistics | (a) P(>12.1 s); (b) P(≥6 of 8); (c)(i) P(1st), (ii) P(3rd) for a given athlete; (iii) advancement rule: 1st and 2nd go through, top 4 of the six 3rd-placed | running competition |
| 11 | 13 | Trapezoidal + "by considering" | (a) trapezoidal, 5 sub-intervals, ∫eˣ ln x; (b) integral of (x+1)eˣ ln x + 1/x; (c) α by combining; "α > 4?" judge | pure |
| 12 | 11 | Chain rule + limit | du/dt, dN/dt in terms of u; N'' = N·p(u); t₀; max or min; long-term total | software bugs |

### 2021 and 2020 (briefly)
- **2021 Section A:**
  - Q1 discrete r.v. + conditional given X ≤ 2
  - Q2 disease test (total probability, Bayes)
  - Q3 exam grade A (binomial on a derived probability, conditional)
  - Q4 proportion CI and minimum n
  - Q5 differentiation with a given antiderivative form, area
  - Q6 e^(−6x)(1−kx²)⁵
  - Q7 quotient rule and extrema on a closed interval
  - Q8 f' given, tangent line → k, then f
- **2021 Section B:** Q9 potatoes (normal, binomial), Q10 e-mails (Poisson, conditional), Q11 trapezoidal and convexity (J/K < 0.44?), Q12 tank rain (maximum rate, exact integral, cone similar triangles, related rates).
- **2020 Section A:**
  - Q1 discrete r.v. with a, p
  - Q2 photocopier (binomial, geometric-type expected wait)
  - Q3 events with k
  - Q4 proportion CI and β from width
  - Q5 (1+keˣ)³
  - Q6 extrema "agree?" on g = x+5/x+ln x⁴
  - Q7 solid optimisation
  - Q8 by considering d/dx(xe^(mx))
- **2020 Section B:** Q9 bus times (normal), Q10 dice coupons + Poisson prizes, Q11 trapezoidal and rate-of-change models, Q12 duck population P = 32/(a^(5+bt)+8).

---

## 3. Archetypes by topic

IDs below are our own labels (S = statistics, C = calculus). Tag with `M1-<unit>` once `syllabus/m1.md` exists.

### Statistics and probability

**S1 Discrete random variable with unknown constants** (every year, Q1; also appears as a sub-part elsewhere).
- Probabilities sum to 1 → one equation; a given E(X), Var(X) or Var(aX+b) → a second equation.
- Often a quadratic whose roots must be filtered by an **allowed range** or by integer-ness: 2024 Q1 (6 < b < 15), 2023 Q1 (n an integer).
- 2025 Q1 uses a formula pf (kx³/3ˣ) rather than a table.
- Follow-ups: conditional probability inside the table (2021 Q1), CLT on the sample mean (2022 Q1, 2025 Q1(b)), independence of two defined events (2024 Q1(b)).
- Variance of a transformed variable needs **E(X²) or E(X⁴)**: Var(10X²−9) = 100 Var(X²) (2023 Q1).

**S2 Expectation and variance of linear forms, "is it possible?"** (2022 Q2, 2025 Q2, 2020 Q1).
- Var(aX+b) = a² Var(X); E(aX+b) = aE(X)+b.
- "Could Y be Poisson?" is answered with mean ≠ variance. "Could X be binomial?" is answered with np = 8.8 and npq = 9 > 8.8, which is impossible since q < 1.

**S3 Events: conditional probability, independence, mutually exclusive** (every year; `M1 2020 Q3`, `2022 Q3`, `2023 Q4`, `2025 Q4`).
- Given: a conditional probability, P(A∪B), sometimes an unknown p or k.
- Typical sequence: find P(A) or P(B) → test independence by P(A)P(B) = P(A∩B) → decide mutually exclusive by P(A∩B) ≠ 0 or by P(A)+P(C) > 1.
- "Prove" variants need a clean algebraic chain (2022 Q3(a)).
- 2025 Q4(a) asks for a **range** of P(A) from two inequalities.

**S4 Total probability and Bayes** (`2021 Q2`, `2023 Q3`, `2024 Q2`; also the "given that" parts of S5–S8).
- Two-stage tree (disease/test, tunnel/payment, glasses/gender).
- Final part asks for the reversed conditional. The 2021 version then asks whether it is "less than 0.6", which needs an exact fraction (291/533 in the script).

**S5 Binomial distribution** (`2020 Q2`, `2021 Q3`, `2024 Q3`, `2025 Q2`; heavily reused inside Section B).
- Finding p from a given probability (P(Y=0) = 0.027 → p = 0.7), or from a ratio of two probabilities (2024 Q3 gives a quadratic in p).
- "Least n such that P(at least 1) > c" → logarithms and an integer ceiling (2024 Q3(b)).
- **Derived success probability:** the trial is a two-step chain (knows × careful = 0.8 × 0.9, 2021 Q3).
- The 2020 Q2(b)(ii) trick: expected number of acceptable photocopies between two unacceptable ones = 1/p − 1 (a geometric reading; the script's 9.1133 matches 1/0.09888 − 1, so the −1 is applied correctly).

**S6 Poisson distribution** (Section B Q9/Q10 in 2020–2025; Section A in 2023 Q2).
- Single rate (λ per hour, per minute, per day) with a time-scale conversion: 6 hours → λ = 7.8 (2021 Q10), per hour from per minute (2023 Q2).
- **Sums of independent Poissons add the means** (2021 Q10(c)–(e), 2025 Q9(c)).
- **Thinning:** each event is "heavy" with probability p → the number of heavy events is Poisson(λp) (2022 Q9(c)(iii): P(no heavy) = e^(−2.1×0.2336) compared with 0.2).
- **Conditional probabilities across the sum:** "given the total is 2, P(both non-commercial)" = P(2 of type N)/P(total = 2) (2021 Q10(d)).
- A **discrete threshold defined by a Poisson count** feeds a binomial: "a day is smooth if fewer than 3 delays" (2024 Q10), "busy if more than 4 calls" (2023 Q10).
- **Combined event over several units** (2023 Q10(c), 2024 Q10(c)): exactly r units satisfy a condition and the total count is n. This is the hardest sub-pattern. Plan to hand it to a teacher for review.

**S7 Normal distribution** (Section B Q9/Q10 almost every year; `2020 Q9`, `2021 Q9`, `2022 Q9–Q10`, `2023 Q9`, `2024 Q9`, `2025 Q10`).
- Standard step: standardise with z, use A(z) from the table, add or subtract 0.5 for tails.
- **Reverse look-up:** a printed probability gives z (e.g. 21.19% small → z = −0.8; 30.85% above 5.7 → z = 0.5). This lets the exact σ and μ come out as clean numbers (σ = 25 in 2021 Q9; μ = 5.1 and σ = 1.2 in 2024 Q9; μ = 2.4 and σ = 4/15 in 2025 Q10).
- **Banded classification** with prices or prizes → expected value or multinomial/binomial counts (2024 Q9(c), 2021 Q9).
- **Binomial or order structure on top of the normal:** "at least 6 of 8 exceed 12.1 s" (2022 Q10(b)); "the 4th is the 2nd big" (2021 Q9(b)); "the 4th day is the 2nd time" (2020 Q9(c)(i)) = negative-binomial pattern, i.e. one success in the last position and (r−1) among the first (n−1).
- **Conditional "given that" built on a compound event** (2020 Q9(c)(ii)–(iii), 2022 Q10(c)).
- **Order statistics by symmetry** (2022 Q10(c)): Peter is the 1st, 3rd, etc. of 8 by a binomial among the other 7. Hard to generate; treat as a rare archetype.
- **Sampling distribution of the mean:** N(μ, σ²/n) used for P(x̄ ≤ 5.4) in 2024 Q9(b).

**S8 Sampling distribution and confidence intervals** (Section A Q3/Q4 in all six years; Section B Q9 in 2023).
- **CI for a mean (σ known or s given):** x̄ ± z σ/√n. 2022 Q4(a), 2023 Q9(a) (from a grouped frequency table, using class midpoints).
- **CI for a proportion:** p̂ ± z √(p̂(1−p̂)/n) (2020 Q4, 2021 Q4).
- **Inverse problems:**
  - from the CI width find the confidence level β (2020 Q4(b), 2024 Q4(a)): z = width/(2 SE) → A(z) → β = 2A(z) × 100%, rounded;
  - from an upper limit find α (2023 Q9(b));
  - find the least sample size n for a given width (2021 Q4(b)): n ≥ (2z√(p̂q̂)/w)², round **up**.
- **Combine two samples:** pooled mean and pooled s from Σx² (2024 Q4, 2025 Q3); the sample variance formula is printed.
- **Qualitative "wider/narrower?"** explanation (2022 Q4(b)): smaller n, same σ → wider.
- **Table z values used:** 1.645 (90%), 1.96 (95%), 2.575 (99%), plus table look-ups for any other level (2.43 for 98.5%, 2.31 for 98%).

### Calculus

**C1 Binomial / exponential expansion** (5 of 6 years in Section A: `2020 Q5`, `2021 Q6`, `2022 Q5`, `2023 Q5`, `2024 Q5`, `2025 Q6`).
- Expand e^(kx) to x² or x³ (or x⁴ in 2021), then multiply by a binomial (1+ax)^m or add one.
- A **coefficient condition** gives an equation in the unknown (a³ = 343, quadratic in k, quadratic in m).
- Finishing ideas: a linear-in-ln-y reading (2022 Q5(b), 2025 Q6), or a chain rule with x = 2^u (2023 Q5(b)(ii)).
- The paper expects **ascending powers "as far as the term in xⁿ"**.

**C2 Exponential and log models, ln-linear form** (`2022 Q5`, `2023 Q6`, `2024 Q11`, `2025 Q6`, `2020 Q12(a)`).
- "Express ln A as a linear function of t": slope and intercept read off, then used to find constants.
- Later parts ask for an exact time (e.g. A = 2P → t = 20 ln 2) and the rate of change there.
- **Model with a polynomial factor:** P = a(−t²+10t+8)e^(bt), take ln(P/q) (`2024 Q11`).

**C3 Differentiation techniques** (Section A Q5–Q8).
- **Product and chain** on e^(1/(x−2)) (2025 Q5); **quotient** (2021 Q7, 2022 Q6); **fractional powers** x^(2/3)(x+2)^(1/3) (2023 Q8); **log differentiation** of a variable exponent (2024 Q6).
- Sub-parts often ask for f'' too (2021 Q11, 2023 Q8(b)).
- **Tangent from an outside point** (2022 Q6(b)): the point (3, −2) is **not** on the curve; a strong script must solve for the tangent point. See §6.

**C4 Extrema, stationary points and "agree?" claims** (`2020 Q6`, `2021 Q7`, `2022 Q8`, `2023 Q11`, `2025 Q8`).
- Solve f' = 0, build a sign table, evaluate.
- **Closed-interval extrema** include end points (2021 Q7: 0 ≤ x ≤ 5).
- **"Does g attain an extreme value at x = 0?"** — f' = 0 but no sign change (2023 Q11(b)).
- **Greatest slope of the tangent** = maximum of f' → solve f'' = 0 (2023 Q11(d)).
- **Prove** statements: f has its maximum at x = 0 (2022 Q8(a)).
- **Claims:** "someone says the maximum is less than the minimum" (2020 Q6) (a local max can be less than a local min).

**C5 Optimisation and related rates** (`2020 Q7`, `2021 Q12`, `2024 Q7`, `2025 Q12`).
- Surface area or perimeter fixed, maximise volume (2020 Q7). Cone filling with similar triangles, dV/dt = Qh² dh/dt, evaluate at the time of max inflow rate (2021 Q12).
- **Constant diagonal** (2024 Q7): 15–20–25 triple, breadth shrinking → rate of area change.
- Two-stage: "describe how s varies when v increases from 1", then compose with a model v(t) (2025 Q12).

**C6 Integration** (Section A Q7–Q8 and inside Section B).
- **By considering d/dx(...)**: x e^(mx) (2020 Q8), x e^x ln x (2022 Q11(b)), x^(m+1) ln x (2025 Q7).
- **Substitution:** u = ln x (2023 Q7), u = 1+2^(3x) (2021 Q8(b)), u = 5ᵗ+1 with partial fractions (2025 Q11(b)), u = √x (2022 Q7(b)).
- **Reverse-engineered antiderivative**, given as a hint: g(u) = e^(−u)(u²+2u+2) with u = x^(1/3) (2021 Q5).
- **Area:** locate the x-intercepts first (2023 Q7(a) in terms of e), then **split at the intercepts** so each piece is positive; a trap if the region crosses the x-axis (2023 Q7, 2024 Q8(b)).
- **Normal-table integral** (2024 Q8(a)): ∫₀^0.5 e^(−x²/2) dx = √(2π) × A(0.5), a bridge between statistics and calculus.
- **Long-run behaviour:** "estimate after a very long time" = limit as t → ∞ (2022 Q12(d), 2023 Q12(c)(ii), 2020 Q12(b)(iii), 2024 Q12(b)(ii)).

**C7 Trapezoidal rule and over/under-estimates** (`2020 Q11`, `2021 Q11`, `2022 Q11`, `2023 Q8`, `2024 Q11`, `2025 Q11` — every year).
- 4 or 5 sub-intervals; the formula is not printed.
- **Over/under-estimate decided by the sign of f'':** f'' > 0 on the interval → trapezium over-estimates; f'' < 0 → under-estimates (2023 Q8(c), 2020 Q11(a)(ii)).
- **A "someone claims" part follows,** which combines the estimate and the convexity direction to get a bound:
  - 2021 Q11: J/K < 0.44? — J is under-estimated, K is estimated by subtraction (so over-estimated).
  - 2022 Q11(c)(ii): α > 4?
  - 2024 Q11(d)(ii): sum > 160?
  - 2025 Q11(b)(iii): exceeds 1.7 million?
- 2020 Q11(b)(ii) uses an **exact integral compared with a percentage of the first total**.
- The answer to the "claim" parts, from the scripts: 2021 disagree, 2022 agree, 2024 agree, 2025 agree (check each with a teacher; see §6).

**C8 Rates of change in a context** (`2020 Q11`, `2021 Q12`, `2024 Q12`, `2025 Q11–Q12`).
- A rate is given as a function (rain inflow, revenue per month); totals come from integration, and "greatest rate" from the second derivative.
- Use of limits for the long-run rate (2024 Q12(b)(ii)).

---

## 4. Scaffolding patterns, mark allocation, table usage

### Scaffolding patterns (what the question gives and what it asks)
1. **Hint by structure.** Early parts produce the key object (du/dt in 2023 Q12(a), 2022 Q12(a)), later parts use it ("hence", "using the result of (a)").
2. **"By considering d/dx(...)"** replaces a hard integral with a three-line argument (2020 Q8, 2022 Q11(b), 2025 Q7).
3. **Unknown constants pinned down in layers.** Σp = 1, then E(X), then Var (2020 Q1, 2021 Q1, 2022 Q1, 2024 Q1); constants fixed by a point on a graph and an intercept (2020 Q12(b)(i), 2023 Q6(b), 2024 Q11(b)).
4. **"Prove", "show" and "find the exact value"** (2022 Q3(a), Q7(a), Q8(a)(b)(i); 2023 Q12(b)): method marks dominate; the final line must state the target.
5. **"Agree?" / "Do you agree?" / "Is it possible?" / "Will it be greater than, equal to or less than?"** A claim is stated; the candidate must answer yes/no and explain with a calculation or an inequality. These appear **in every year, often 2–4 per paper** (2025 Q5(b), Q8, Q10(c), Q11(b)(iii), Q12(b)(ii)).
6. **Parameter tweak.** The same model is re-used with a changed condition (new CI after deleting data in 2022 Q4(b); different probabilities with "p = 0.8 find..." in 2025 Q10(c)).
7. **Time-ordered Section B stories.** Fresh numerical information is introduced in each part (2024 Q9: grades, prices, trolley of 8).
8. **A claim at the end of a Section B question** is the typical "last 2–4 marks" item.

### Mark allocation norms (inferred; HKEAA marking schemes were not available)
- **Section A:** 5–8 marks per question, 2–4 parts. Per-part marks are not always printed.
- **Section B:** 11–14 marks, 3–7 parts, with the first part 1–3 marks, the last part the longest (up to 12 marks as a single part: `M1 2025 Q11(b)`).
- **Marks per command word (inferred):**
  - "Find" with a table look-up: 2–3 marks.
  - "Prove" a given result: 2–3 marks.
  - "Explain / do you agree": 2–4 marks (conclusion + reason).
  - "Hence estimate": 2 marks.
- **M/A-style marks are not shown** in these question books, but the instructions say "all working must be clearly shown". Treat each correct stage in the script as at least a method mark, and expect marks for the final answer only when it is exact or 4 d.p.

### Statistical-table usage
- **Only the A(z) table** (0 to z) is provided. There is no Poisson, binomial or inverse-normal table, and no t-table. Poisson and binomial values are computed by hand or calculator.
- **Typical look-ups:**
  - Forward: P(Z < −1) = 0.5 − A(1.00) = 0.1587 (2020 Q9(a)); P(−1 < Z < 2.5) = 0.3413 + 0.4938 = 0.8351 (2020 Q9(b)).
  - Reverse: find z with A(z) = 0.2881 (z = 0.8), 0.1915 (z = 0.5), 0.3944 (z = 1.25).
- **Questions are designed so that the printed probabilities match an exact table entry**, e.g. 0.3085, 0.1587 (z = 0.5, 1.0), 21.19%, 30.85%, 78.88%, 0.2266, 0.9332. The script then writes exact or 4 d.p. values.
- **CI confidence levels with table entries:** 98.5% needs A = 0.4925 → z = 2.43; 98% needs z = 2.31 (A = 0.4896); 99% uses 2.575 (standard value, not from the 4-d.p. table); 95% uses 1.96; 90% uses 1.645.
- **Any derived probability** is carried to full calculator precision and rounded to 4 d.p. only at the end (see candidate's habit in 2023 Q9(c)(ii)).

### Typical traps built into the questions
- **Rate conversion:** per minute vs per hour (2023 Q2: the script treated the mean as 3 instead of 180).
- **Root rejection:** a quadratic gives a root outside the allowed range (2024 Q1: b in (6, 15); 2020 Q1: p = −1).
- **A point not on the curve** (2022 Q6(b)).
- **Round up** for least n (2021 Q4(b), 2024 Q3(b)).
- **Area across the x-axis** (2023 Q7, 2024 Q8).
- **Limit vs value at the end point** (2022 Q12(d), 2023 Q12(c)).
- **Critical point is not an extremum** (2023 Q11(b), `f' = 0` but no sign change).
- **"Given that" conditioning with a compound event** (2023 Q9(c)(ii): "among the final 5").
- **Variance squares the coefficient** (Var(3Y−1) = 9 Var(Y); Var(10X²−9) = 100 Var(X²)).
- **Independence vs mutually exclusive confusion** (2020 Q3, 2022 Q3, 2023 Q4).
- **Combined samples need Σx², not just the mean of the standard deviations** (2024 Q4(b), 2025 Q3(b)).

---

## 5. Marking conventions visible from the scripts (inferred, not official)

- **Accuracy:** "numerical answers exact or 4 d.p." (cover instruction). The scripts give 4 d.p. (0.1056, 0.3313, 1.8108) or exact forms (ln 2 (6048 + 6e²), 36/ln 3, 3860/3 style). **Label: stated in the instructions; handling of 3 d.p. answers is inferred to lose a mark.**
- **Rounding to an integer** only when the question says so ("correct to the nearest integer": 2023 Q9(b), 2020 Q4(b); "nearest minute" in 2020 Q9(c)(iv)).
- **Probabilities from the table are quoted with the table's 4 d.p.** (0.1056 from 0.5 − 0.3944). Using a calculator value for z instead may differ in the 4th d.p.; the scripts show full-precision working then round at the end, e.g. 2023 Q9(c)(ii).
- **Intermediate values:** full precision carried through (e.g. 0.037439062 and 0.437829035 in 2021 Q3(c)).
- **Showing a formula before substituting** is the norm (P(A∪B) = P(A)+P(B)−P(A∩B); CI formula).
- **"Explain" parts** carry an answer sentence ("A and B are not mutually exclusive because P(A∩B) ≠ 0"; "an under-estimate because f'' < 0 on the interval").
- **Sign tables** are used to justify maxima/minima; a second-derivative sign is accepted for over/under-estimates.
- **Exact vs decimal:** "find the exact value" requires ln and e forms (2023 Q6(b)(i): 20 ln 2).
- **Unit and context:** thousand, million, hours: unit stated at the end ("thousand" in 2020 Q11, "1.8108" for a weight change).
- **Rejecting a root** is written explicitly ("rejected") on the script.
- **Candidates are rewarded for stating the distribution** ("Let X be the number of..., X ~ Po(3.2)").
- Labelled by inference only: method/accuracy mark splits, e.c.f. rules, and whether a numerical answer from a wrong earlier part is followed through.

---

## 6. Verification notes

### Script reliability: errors we spotted
Do not copy these answers into a mark scheme. The generator should recompute everything itself.

| Question | What looks wrong in the script |
|---|---|
| 2023 Q8(a) | Script gives A = 11/2, B = 9. Recomputing gives f' = (3x+4)/(3x^(1/3)(x+2)^(2/3)), so **A = 3, B = 4** |
| 2023 Q2(b) | Script uses mean 3 for an hour; the hourly mean is 180 |
| 2023 Q12(b) | Script's antiderivative has the wrong constant structure; the identity gives (1/(2√2)) ln((t²−√2t+1)/(t²+√2t+1)) + C |
| 2024 Q8(b) | Script gives 1.3558; recomputing 2(1−e^(−1/8)) − √(2π)·A(0.5) = 0.2350 − 0.4800 gives a magnitude of **0.2450** (area) |
| 2022 Q6(b) | Script treats (3, −2) as if on the curve, using the slope at x = 3 |
| 2020 Q7 | Printed as a cylinder, but the script's volume formula is the cone's V = ⅓πr²h; unresolved (cylinder with surface area 486π would use 2πr² + 2πrh). |
| 2023 Q10(c) | Script treats the busy phones' total calls as Po(9.6); this ignores that a "busy" phone has at least 5 calls. Unresolved. |
| 2022 Q8(a) | The proof is not rigorous in the script (it does not handle the sign of 8ax⁶−760x³−8640 for all a). Treat the item as dubious until confirmed. |

### Numeric-checkable (mathjs or exact rational arithmetic)
- **All Poisson/binomial probabilities** (2021 Q10, 2023 Q10(a)–(b), 2024 Q10(a)–(b)).
- **Normal probabilities from the A(z) table:** the generator must pick numbers with exact table entries and then compare with the table (not with a calculator).
- **CI endpoints, least n, β/α from a width:** direct formulae.
- **Trapezoidal sums:** straightforward (2022 Q11(a) = 2.0829; 2025 Q11(a) = 25.1805 per the script; 2023 Q8(c) = 1.9864).
- **Definite integrals with closed forms** (areas, "by considering"), checkable by Simpson/Gauss integration.
- **Discrete-r.v. systems** (solve linear and quadratic equations).
- **Extrema and tangent lines:** root finding and substitution.
- **Expansions:** series coefficients check by symbolic expansion (or by evaluating polynomials at random points).

### Need symbolic or random-point checking
- **Identity proofs** ("prove P(A) = p/3 + 0.45", "prove a = 5"): check the given result numerically at random parameter values, then flag the proof for teacher review.
- **Derivative forms with A, B, p(t), p(u):** check by comparing the printed form with a numerical derivative at random points.
- **Antiderivatives and "by considering":** differentiate the claimed result and compare at random points.
- **Over/under-estimate verdicts:** check the sign of f'' on the interval at random sample points, **and** compare the trapezoidal sum with a high-accuracy integral.
- **Limit questions:** evaluate at large t.
- **Conditional events across compound structures (S6 combined events, S7 order statistics):** verify with a Monte-Carlo simulation as well as the closed form.

### Flag for teacher review
- Every "explain / do you agree?" item (the generator can supply a verdict and the key inequality; wording of the reason needs a teacher).
- Order-statistics and "final 5" conditional questions.
- Any question whose answer depends on a table entry rounding (z from a 4-d.p. area).

---

## 7. Generator recipe (summary)

1. **Paper shape.** Use 8 Section A questions (50 marks) and 4 Section B questions (50 marks), in this default order:
   - **Section A:**
     - Q1 discrete r.v. (6–7)
     - Q2 binomial/Poisson/E-Var (5–6)
     - Q3 events or Bayes (7)
     - Q4 CI or events (5–6)
     - Q5 expansion (6–7)
     - Q6 differentiation/exponential model (6–7)
     - Q7 integration or optimisation (4–7)
     - Q8 extrema/area/trapezoidal with a claim (7–8)
   - **Section B:**
     - Q9 normal + binomial/CI (11–13)
     - Q10 Poisson + binomial/conditional (12–14)
     - Q11 trapezoidal + exponential/log model (12–14)
     - Q12 rate of change, limit, optimisation (11–13)
2. **For each question:**
   - pick an archetype (S1–S8, C1–C8);
   - choose parameters so table entries and "nice" exact answers come out (σ = 25, μ = 5.1, a³ = 343, x = 1, 3 stationary points);
   - lay out the parts: **1–2 mark set-up → 2–3 mark core calculation → hence/estimate → claim or limit**;
   - add one trap from §4;
   - put a "someone claims" or "is it possible" item into 2–4 questions per paper.
3. **Keep these constants in the generator's data files:**
   - Standard normal table A(z), 0.00 to 3.59, 4 d.p.
   - Common z values: 1.645, 1.96, 2.575.
   - Trapezoidal rule formula h/2 [f₀ + 2(f₁+...+f_{n−1}) + f_n].
4. **Solution generation.**
   - Compute with exact arithmetic or mathjs, then round to 4 d.p. only at the end.
   - Show: the distribution statement, the formula, the substitution, the answer.
   - Write "reject" explicitly when a root is out of range.
   - Do **not** reuse the candidate-script numbers without recomputing (§6).
5. **Marking.** Write a short mark scheme in M/A style (method marks for each stage, an accuracy mark for the final 4 d.p. or exact answer), but label it "inferred from the scripts" until the HKEAA marking scheme is available.
6. **Verification.** Numeric answers go through the mathjs checker (§6). Symbolic identities are checked at random points, simulation checks cover conditional compound events, and claims or explanations are routed to teacher review.
