# HKDSE Mathematics Compulsory Part — how the questions are built

Status: **draft v0.1 (2026-10-07), awaiting review by a Maths teacher.**

These notes are distilled from HKEAA material in `paper/math/compuslary/` (unofficial copies, git-ignored):
- **Paper 1 (conventional):** Level 5 candidate Question-Answer Books, 2020–2025. These are the printed questions with marks, plus a strong candidate's handwritten working. **Read in full:** 2023, 2024, 2025 (exemplar 1 of each) and 2022. **Not read:** 2020 and 2021 (rendered only), and the second exemplar in each file, which is the same paper.
- **Paper 2 (MC):** `mc/` 2016–2023. **Read in full:** 2023, 2022, 2021, 2019. **Not read:** 2016–2018 and 2020.

Citations look like `CP 2023 P1 Q9` (Paper 1) or `CP 2023 P2 Q9` (Paper 2). Topic names follow the EDB Learning Units. Topic IDs (`CP-<unit>`) are **not yet attached**: `syllabus/math-compulsory.md` did not exist when this was written.

Caveats:
- **No MC answer key was found.** All Paper 2 keys below are our own solutions. Uncertain ones are marked `?`, and distractor slips marked "(guess)" are plausible rather than verified.
- Paper 1 working is a strong candidate's script, not the official marking scheme. Anything about M/A marks, e.c.f. and accepted ranges is **inferred**.
- **Candidate scripts are not always complete or correct.** Examples: CP 2023 P1 Q17(b) and Q19(b)(iii) were left unfinished; CP 2024 P1 Q12 and CP 2025 P1 Q13 are partly unfinished or messy. Don't copy them as model answers.
- Paper 2 scans: figure-dependent items are the least certain (CP 2023 P2 Q16, Q18, Q21, Q31; CP 2022 P2 Q20, Q21, Q40; CP 2021 P2 Q9, Q13, Q16, Q19, Q29, Q32, Q41; CP 2019 P2 Q13, Q28, Q37, Q40).
- **No Foundation / non-foundation label is printed on the P2 papers we read.** The split below is inferred (see §1).
- Paper 1 and 2 weightings and timings (about 65% / 35%) are not in these PDFs. Check them against the HKEAA assessment framework before use.

---

## 1. Paper blueprint

### Paper 1 (105 marks, 19 questions, all compulsory)

| Section | Marks | Questions | Mark per question |
|---|---|---|---|
| **A(1)** | 35 | Q1–Q9 | 3 / 3 / 3 / 4 / 4 / 4 / 4 / 5 / 5 (2022, 2023, 2024) |
| **A(2)** | 35 | Q10–Q14 | 6 / 7 / 7 / 7 / 8 (2022–2024); **6 / 6 / 7 / 7 / 9 in 2025** |
| **B** | 35 | Q15–Q19 | 4 / 4–5 / 6–8 / 7–9 / **12 in the last question** |

Exact splits:

| Year | A(1), Q1–9 | A(2), Q10–14 | B, Q15–19 |
|---|---|---|---|
| 2022 | 3, 3, 3, 4, 4, 4, 4, 5, 5 | 6, 7, 7, 7, 8 | 4, 5, 7, 7, 12 |
| 2023 | 3, 3, 3, 4, 4, 4, 4, 5, 5 | 6, 7, 7, 7, 8 | 4, 5, 6, 8, 12 |
| 2024 | 3, 3, 3, 4, 4, 4, 4, 5, 5 | 6, 7, 7, 7, 8 | 3, 4, 8, 8, 12 |
| 2025 | 3, 3, 3, 3, 4, 4, 5, 5, 5 | 6, 6, 7, 7, 9 | 4, 4, 6, 9, 12 |

**Section A(1): short, mostly one topic, 3–5 marks.** The order is stable:
- **Q1–Q3 (3 marks each):** algebraic manipulation. Rotate through indices, change of subject, simplifying algebraic fractions, factorisation, or a simple simultaneous or ratio setup.
  - 2023: Q1 change of subject, Q2 indices, Q3 approximation.
  - 2024: Q1 fractions, Q2 change of subject, Q3 factorisation.
  - 2025: Q1 indices, Q2 fractions, Q3 ratio/simultaneous.
  - 2022: Q1 indices, Q2 simultaneous, Q3 fractions.
- **Q4–Q7 (4 marks each, 3 in 2025 Q4):** a compound inequality (or factorisation) is always present. The others are percentages or ratio, plus a small geometry or coordinate item (polar coordinates 2024 Q7; rotation/translation 2025 Q4, 2022 Q7; circle angles 2023 Q7).
- **Q8 (5 marks): a geometry proof or congruence/similarity item.** Part (a) is "prove", part (b) is a calculation using it (2022–2025).
- **Q9 (5 marks): data handling.** Unknown frequency or digit, then mean, median, mode, probability, or standard deviation (2022–2025).

**Section A(2): five 6–9 mark questions. The order varies, but the set is nearly fixed:**
1. **Variation / function:** partly constant partly varies as x or x² (2022 Q10, 2023 Q12, 2024 Q10, 2025 Q11).
2. **Statistics:** stem-and-leaf or table with an unknown, then dispersion (2023 Q11, 2024 Q11, 2025 Q12, 2022 Q11).
3. **Coordinate geometry / locus / circle** (2022 Q12, 2023 Q10, 2024 Q12, 2025 Q13).
4. **Mensuration:** cone, frustum, pyramid or sphere, with similar solids (2022 Q13, 2023 Q14, 2024 Q13, 2025 Q14).
5. **Polynomial:** remainder or factor theorem, then roots (2022 Q14, 2023 Q13, 2024 Q14, 2025 Q10).

**Section B: five questions that get harder to the end.**
- **Q15 (3–4 marks): counting probability.** Choose from a group, with (a) a basic event and (b) a complement or a conditional (2022–2025).
- **Q16 (4–5 marks): a short algebra or log question.**
  - Quadratic roots, then a circle (2023).
  - Log-linear function (2024).
  - Log system (2025).
  - Vertex then area ratio (2022).
- **Q17 (6–8 marks): sequences, 3D trig, or a coordinate-geometry question.** Sequences: 2025 Q17, 2022 Q17. Locus plus circle plus tangents: 2024 Q17. Pyramid: 2023 Q17.
- **Q18 (7–9 marks): 3D trig, or vertex plus orthocentre, or logs plus sequence.** 2022 Q18 and 2024 Q18 are 3D with folded sheets or cards. 2023 Q18 is log plus AP. 2025 Q18 is vertex plus orthocentre/concyclic.
- **Q19 (12 marks): the long coordinate-geometry question,** with 3–4 parts and 2–8 marks each.
  - 2022: circle, tangents, incircle.
  - 2023: triangle centres (circumcentre, orthocentre, in-centre).
  - 2024: quadratic transformation, AP/GP, rhombus test.
  - 2025: circle with tangent line.

### Paper 2 — multiple choice (45 questions)
- **Section A: Q1–Q30. Section B: Q31–Q45** (the cover says 30 + 15). Options A–D.
- **Order:** in each section, Number & Algebra → Measures, Shape & Space → Data Handling.
- **Section A:** Q1–Q14 are algebra and number, Q15–Q27 are measures, shape and coordinates, and Q28–Q30 are data handling.
- **Foundation vs non-foundation (inferred, to be confirmed by a teacher).** Section A reads as the common core. Section B holds the extension topics, namely number bases, logs, complex numbers, linear programming, geometric sequences, tangent-chord, 3D, centres of a triangle, combinations, conditional probability and standard score. Our guess is that Section A = Foundation Part and Section B = non-foundation topics.

**Topic distribution per year** (our classification; linear programming counted under Algebra, trig under Measures):

| Year | A: N&A | A: M&S (incl. coordinates) | A: Data | B: N&A | B: M&S | B: Data |
|---|---|---|---|---|---|---|
| 2023 | 13 | 14 | 3 | 7 | 4 | 4 |
| 2022 | 14 | 13 | 3 | 7 | 4 | 4 |
| 2021 | 14 | 13 | 3 | 7 | 4 | 4 |
| 2019 | 14 | 13 | 3 | 6 | 5 | 4 |

**Generator default: Section A 14/13/3, Section B 7/4/4.** Section B fixed order:
1. Number bases / HCF-LCM / logs (usually a log-linear graph) / complex numbers.
2. Graph transformation or linear programming, then a sequence (AP or GP).
3. Tangent-chord and circle angles, trig or 3D angle, coordinate geometry (circumcentre, incentre, chord midpoint, orthocentre).
4. Counting (C(n,r), permutations).
5. Probability.
6. Statistics: standard score, then a "must be true" SD/IQR/median item last.

**Concept anchors that repeat in Section A** (year pairs 2022/2023 unless noted):
- 3 s.f. range for an approximation (CP 2023 P2 Q7, CP 2022 P2 Q6, CP 2021 P2 Q5).
- Remainder theorem with a given divisor (CP 2023 P2 Q9, CP 2022 P2 Q9, CP 2019 P2 Q9).
- Percentage with discount and profit (CP 2023 P2 Q11, CP 2022 P2 Q11 as compound interest, CP 2019 P2 Q11).
- Variation (CP 2023 P2 Q13, CP 2022 P2 Q13, CP 2021 P2 Q12, CP 2019 P2 Q13).
- Pattern sequence a_{n+1} = a_n + f(n) (CP 2023 P2 Q14, CP 2022 P2 Q14, CP 2021 P2 Q13).
- Polar rotation (CP 2023 P2 Q24, CP 2022 P2 Q25) and reflection/rotation (CP 2021 P2 Q23, CP 2019 P2 Q25).
- Locus (CP 2023 P2 Q26, CP 2022 P2 Q26, CP 2021 P2 Q25, CP 2019 P2 Q26).
- Weighted mean (CP 2023 P2 Q30, CP 2022 P2 Q29).

---

## 2. Paper 2 MC — formats and distractors

### Formats per paper
- **Calculation or simplification (single key):** about 25–26 of 45.
- **(I)(II)(III) statements:** 6–7 per paper. Menu: usually (I) only / (II) only / (I) and (II) only / (I) and (III) only / (II) and (III) only / all. Items: CP 2023 P2 Q18, Q19, Q26, Q27, Q35, Q45; CP 2022 P2 Q10, Q13, Q20, Q24, Q30, Q32, Q45; CP 2021 P2 Q14, Q17, Q19, Q21, Q35, Q36, Q45; CP 2019 P2 Q10, Q23, Q27, Q29, Q41, Q45.
- **Figure or graph reading:** about 11–14 per paper: angle chasing, polar or coordinate geometry, stem-and-leaf, box-and-whisker.
- **"Must be true" single statement** (a few): CP 2022 P2 Q8, CP 2021 P2 Q12 (as "must be constant"), CP 2023 P2 Q33.

**(I)(II)(III) sets** have one core fact, one near-miss, and one that fails on a boundary case:
- A boundary or special value decides it: "n = 3, not n > 3" (CP 2022 P2 Q24); "v < 4 is not forced when n = 0" (CP 2023 P2 Q45).
- A "looks equal" figure trap (CP 2023 P2 Q18, Q21).
- Two statements true by symmetry and one that needs an extra condition (CP 2023 P2 Q19; CP 2019 P2 Q41: orthocentre is a vertex, incentre is inside).
- Sign or direction depending on a parameter: "I is true only if d > 0" (CP 2021 P2 Q45); the intercepts read off ticks (CP 2019 P2 Q23).
- Statistics: what a box plot can tell you (range and IQR, not SD) (CP 2019 P2 Q29); transformations scale SD and IQR but not the mean shift (CP 2022 P2 Q45, CP 2019 P2 Q45).

### Distractor recipe: one named slip per wrong option
Each wrong option comes from one concrete slip, and the key is the only option with no slip. Options are in ascending order for numbers.

| Slip | Examples |
|---|---|
| **Sign error / swapped signs** | CP 2021 P2 Q3 (each option one sign off), CP 2021 P2 Q4, CP 2019 P2 Q24 (8 vs -8), CP 2022 P2 Q1 |
| **Inverted ratio** | CP 2022 P2 Q12 (20:31 vs 31:20), CP 2022 P2 Q41 (8:15 vs 15:8), CP 2021 P2 Q6, CP 2019 P2 Q12 |
| **Forgot ± / lost a root** | CP 2022 P2 Q4 (divided by a factor, losing a root), CP 2022 P2 Q39 (forgot the negative root) |
| **Union vs intersection ("or" treated as "and")** | CP 2023 P2 Q6, CP 2021 P2 Q10, CP 2019 P2 Q7 |
| **Forgot to flip the inequality (÷ by negative)** | CP 2021 P2 Q10 |
| **Rounding: nearest vs down / bound ends** | CP 2022 P2 Q6 (rounded *down* to 3 s.f.: 345 ≤ x < 346 vs 344.5 ≤ x < 345.5); CP 2021 P2 Q5; CP 2023 P2 Q7; CP 2021 P2 Q38 (729 vs 728 by truncation) |
| **Wrong formula: a different compounding rule** | CP 2022 P2 Q11 (simple, annual, monthly key, continuous each an option); CP 2019 P2 Q11 (simple, annual, quarterly key, monthly) |
| **Percentage base error** | CP 2023 P2 Q11 (used the discount as base), CP 2021 P2 Q9, CP 2019 P2 Q13 (decrease vs increase) |
| **Wrong unknown answered** | CP 2019 P2 Q4 (-10 is α, key is β = -7), CP 2021 P2 Q7 (-5 is h, key is k) |
| **Stopping at an intermediate quantity** | CP 2022 P2 Q18, Q22 (AE = 715 before CD = 728), Q37 (ratio instead of term), CP 2023 P2 Q42 |
| **Off-by-one in n / count** | CP 2019 P2 Q14, Q36; CP 2021 P2 Q13; CP 2022 P2 Q14 (stopped at the 5th or 6th term) |
| **Height vs slant height** | CP 2019 P2 Q15 (756 vs 864) |
| **Area/volume mix** | CP 2021 P2 Q16 (sphere instead of hemisphere), CP 2022 P2 Q15 (curved area only vs total) |
| **Forgot to square the scale or ratio** | CP 2023 P2 Q12 (20 vs 40 km² map), CP 2019 P2 Q12 (4:9 vs 2:3) |
| **Wrong rotation direction or quadrant** | CP 2023 P2 Q24, CP 2022 P2 Q25, CP 2021 P2 Q23, CP 2019 P2 Q25 |
| **Locus mistaken for another shape** | CP 2021 P2 Q25 (perpendicular bisector vs circle), CP 2022 P2 Q26, CP 2019 P2 Q26 |
| **Perpendicular slope without the minus** | CP 2023 P2 Q25, CP 2021 P2 Q27, CP 2019 P2 Q24 |
| **Counting: with vs without replacement; "exactly" vs "at least"** | CP 2021 P2 Q43 (19/27 = with replacement), CP 2021 P2 Q42 ("exactly 4" for "at least 4"), CP 2019 P2 Q43 ("at most 1" and "at least 2" offered for "at most 2"), CP 2023 P2 Q42 (forgot the chair), CP 2023 P2 Q43 (1 - P(1) only) |
| **Weighted mean with weights swapped** | CP 2023 P2 Q30 (swapped weights), CP 2022 P2 Q29 |
| **Mis-read a figure (point on the wrong axis, or frequency read as value)** | CP 2023 P2 Q29 (quartile vs median), CP 2019 P2 Q30 (mode = 36 is the frequency), CP 2022 P2 Q31 (negative base with an even power is positive) |
| **HCF vs LCM exponents** | CP 2023 P2 Q32 (min exponents = HCF), CP 2021 P2 Q31 |
| **Log conversion forgotten (log₉ → log₃)** | CP 2022 P2 Q33, CP 2019 P2 Q31, CP 2019 P2 Q32 |
| **Standard score: used sd wrongly or gave the mean** | CP 2023 P2 Q44 (70 is the mean), CP 2021 P2 Q44 (used 5, not sd 4), CP 2019 P2 Q44 |
| **Linear programming: another vertex (min vs max)** | CP 2022 P2 Q36, CP 2019 P2 Q35, CP 2023 P2 Q37 |
| **Place-value shift in number bases** | CP 2022 P2 Q34, CP 2019 P2 Q33, CP 2021 P2 Q32 (hex digit not carried) |
| **Complex numbers: i² sign** | CP 2023 P2 Q34, CP 2019 P2 Q34 (denominator a² - 1 vs a² + 1; forgot the -i⁶ term) |
| **Assumed perpendicular / special case** | CP 2023 P2 Q40 (key -25/39, option 0 = perpendicular faces), CP 2022 P2 Q8 (assumed f even) |

### Numbers
- **Answers come out exact** (Pythagorean triples recur: CP 2022 P2 Q22 uses 660-275-715 and 572-429-715; 13-20-?).
- A "near miss" is deliberate on at least one approximation item (CP 2021 P2 Q38 = 728.55; CP 2019 P2 Q40 = 67.7).
- Options are in ascending order for numbers.
- Where the stem says "correct to the nearest" or "3 significant figures", the options differ in the last digit or by a bound end.

### Archetypes by topic (each cited)
- **Number and Algebra**
  - Algebraic identities and expansion (CP 2019 P2 Q1; CP 2021 P2 Q3, Q6).
  - Indices (CP 2023 P2 Q3, CP 2022 P2 Q2, CP 2021 P2 Q1, CP 2019 P2 Q2).
  - Change of subject (CP 2023 P2 Q1, CP 2022 P2 Q5, CP 2021 P2 Q2, CP 2019 P2 Q5).
  - Factorisation by grouping (CP 2023 P2 Q4, CP 2022 P2 Q1).
  - Algebraic fractions (CP 2023 P2 Q2, CP 2021 P2 Q4).
  - Approximation and error limits (CP 2023 P2 Q7, CP 2022 P2 Q6, CP 2021 P2 Q5, CP 2019 P2 Q6).
  - Inequalities with "or" (CP 2023 P2 Q6, CP 2022 P2 Q7, CP 2021 P2 Q10, CP 2019 P2 Q7).
  - Functions and the quadratic graph (CP 2023 P2 Q10, CP 2022 P2 Q10, CP 2021 P2 Q14, CP 2019 P2 Q10).
  - Remainder and factor theorem (CP 2023 P2 Q9, CP 2022 P2 Q9, CP 2021 P2 Q8, CP 2019 P2 Q9).
  - Percentages and compound interest (CP 2023 P2 Q11, CP 2022 P2 Q11, CP 2019 P2 Q11).
  - Ratio (CP 2022 P2 Q12, CP 2021 P2 Q11, CP 2019 P2 Q12).
  - Variation (CP 2023 P2 Q13, CP 2022 P2 Q13, CP 2021 P2 Q12).
  - Number patterns (CP 2023 P2 Q14, CP 2022 P2 Q14, CP 2021 P2 Q13, CP 2019 P2 Q14).
  - **Section B:** number bases (CP 2023 P2 Q31, CP 2022 P2 Q34, CP 2021 P2 Q32, CP 2019 P2 Q33); HCF/LCM (CP 2023 P2 Q32, CP 2021 P2 Q31); log-linear graph (CP 2023 P2 Q33, CP 2022 P2 Q32, CP 2021 P2 Q34, CP 2019 P2 Q31); complex numbers (CP 2023 P2 Q34, CP 2022 P2 Q35, CP 2021 P2 Q35, CP 2019 P2 Q34); transformation of graph or linear programming (CP 2023 P2 Q35 and Q37, CP 2022 P2 Q36, CP 2019 P2 Q35); AP/GP (CP 2023 P2 Q36, CP 2022 P2 Q37, CP 2021 P2 Q36, CP 2019 P2 Q36).
- **Measures, Shape and Space**
  - Mensuration (CP 2023 P2 Q15, CP 2022 P2 Q15, CP 2021 P2 Q15–16, CP 2019 P2 Q15).
  - Area and similar triangles (CP 2023 P2 Q17, CP 2022 P2 Q17, CP 2021 P2 Q20).
  - Angles, congruence and similarity (CP 2023 P2 Q18–23, CP 2022 P2 Q18–23, CP 2021 P2 Q18–22, CP 2019 P2 Q16–21).
  - Trigonometry in a figure (CP 2023 P2 Q23, CP 2022 P2 Q23, CP 2021 P2 Q24, CP 2019 P2 Q22).
  - Transformation in the plane, including polar coordinates (CP 2023 P2 Q24, CP 2022 P2 Q25, CP 2021 P2 Q23, CP 2019 P2 Q25).
  - Straight line (perpendicular, intercepts) and locus (CP 2023 P2 Q25–26, CP 2022 P2 Q26, CP 2021 P2 Q25–26, CP 2019 P2 Q23–24, Q26).
  - Circle equation and chord (CP 2023 P2 Q27, CP 2022 P2 Q27, CP 2021 P2 Q27, CP 2019 P2 Q27).
  - **Section B:** tangent-chord and angle chasing (CP 2023 P2 Q38, CP 2022 P2 Q38, CP 2021 P2 Q39, CP 2019 P2 Q39); circle with chord midpoint or diameter (CP 2023 P2 Q39, CP 2021 P2 Q40, CP 2019 P2 Q37); 3D angle between planes (CP 2023 P2 Q40, CP 2022 P2 Q40, CP 2019 P2 Q40); triangle centres (CP 2023 P2 Q41, CP 2022 P2 Q41, CP 2021 P2 Q41, CP 2019 P2 Q41).
- **Data Handling**
  - Probability and counting (CP 2023 P2 Q28, CP 2022 P2 Q28, CP 2019 P2 Q28).
  - Weighted mean (CP 2023 P2 Q30, CP 2022 P2 Q29).
  - Box plot and stem-and-leaf (CP 2023 P2 Q29, CP 2021 P2 Q28–29, CP 2019 P2 Q29–30).
  - Section B: combinations and permutations (CP 2023 P2 Q42, CP 2022 P2 Q42, CP 2021 P2 Q42, CP 2019 P2 Q42); probability (CP 2023 P2 Q43, CP 2022 P2 Q43, CP 2021 P2 Q43, CP 2019 P2 Q43); standard score (CP 2023 P2 Q44, CP 2022 P2 Q44, CP 2021 P2 Q44, CP 2019 P2 Q44); "must be true" statistics under a linear transformation (CP 2023 P2 Q45, CP 2022 P2 Q45, CP 2021 P2 Q45, CP 2019 P2 Q45).

---

## 3. Paper 1 — long questions

### Scaffolding
- **A part is rarely stand-alone.** Parts are chained so (a) hands (b) its number or its structure. Three kinds:
  - **Value chain:** (a) finds a function or number, (b) uses it. CP 2025 P1 Q11 (find p(x); then the range of c for two distinct roots); CP 2024 P1 Q10 (g(x); then h(x) = x g(x) + k has real roots); CP 2023 P1 Q12 (f(5); then use U, V, W for a circle).
  - **"Prove / show" then use:** (a) a proof or relation that the next part relies on. CP 2023 P1 Q16 ((a) prove 5a² = 36b, (b) apply it to a circle-line intersection with OQ : QR = 1 : 4); CP 2025 P1 Q16 ((a) u² - 3u - 18 = 0, (b) find x); CP 2025 P1 Q19 ((a) equal roots gives a, b; (b) tangent lengths and incircle); CP 2023 P1 Q19 ((b)(i) prove t = 24, then (ii) and (iii) use it).
  - **Factorisation staircase:** parts (a), (b) are given factors that make (c) go by grouping. CP 2025 P1 Q5, CP 2024 P1 Q3, CP 2022 P1 Q4.
- **Escalation inside one question:** 1-mark "describe" → 3-mark calculation → "explain whether" verdict.
  - Locus questions: CP 2023 P1 Q10 (a: perpendicular bisector, 1 mark), CP 2025 P1 Q13 (a: 1 mark, b: 3, c: 3), CP 2024 P1 Q17 (a(i) describe, a(ii) equation, b circle, b(ii) a verdict).
- **Verdict ("is the claim correct", "do you agree", "does X exceed Y") parts are 2–4 marks.** Always on the last part of a question. They need both a computed value and a stated conclusion.
  - CP 2023 P1 Q3, Q8(b), Q11(b), Q13(b), Q17(b), Q19(b)(ii) and (iii).
  - CP 2024 P1 Q13(b), Q14(b)(ii), Q17(b)(ii), Q18(b)(ii), Q19(c)(ii).
  - CP 2025 P1 Q7(c), Q10(b), Q12(b)(ii), Q14(c), Q19(b)(iii).
  - CP 2022 P1 Q11(b), Q13(b), Q14(c), Q18(b), Q19(d).
- **New information is released between parts.** For example, CP 2024 P1 Q13(b) introduces a second pyramid only after (a); CP 2023 P1 Q15(b) adds a bag with 8 red balls; CP 2023 P1 Q19(b) adds S, then I.

### Mark allocation per part (typical)
| Part type | Marks |
|---|---|
| State / describe a geometric relationship (locus ⇒ perpendicular bisector) | 1 |
| Substitute into two conditions and solve (variation, polynomial a, b) | 3 |
| Simple calculation with a figure (3D, one step) | 2–4 |
| Prove similar / congruent triangles | 2–3 (inferred: each reason with its statement) |
| Consequent calculation using (a) | 3–4 |
| "Hence" or explain-with-calculation verdict | 2–4 |
| Final long Q19 parts | 2–8 each |

### Recurring archetypes by topic
Topic names are EDB Learning Units. CP IDs to be added when `math-compulsory.md` exists.

- **Number and Algebra**
  - **P1 Change of subject / algebraic fractions** (A(1) Q1–Q3): CP 2023 Q1, CP 2024 Q1–Q2, CP 2022 Q3, CP 2025 Q2. Trap: x on both sides, so factorise.
  - **P2 Indices with positive-index answer** (CP 2023 Q2, CP 2025 Q1, CP 2022 Q1). Trap: a negative power on a bracket, raised to another power.
  - **P3 Factorisation staircase** (CP 2024 Q3, CP 2025 Q5, CP 2022 Q4).
  - **P4 Compound inequality ("and" / "or") then count integers or find the least or greatest** (CP 2023 Q4, CP 2024 Q4, CP 2025 Q6, CP 2022 Q6). Trap: "or" gives the union and open/closed ends; the greatest integer can come from the other inequality (CP 2025 Q6: -5).
  - **P5 Percentages**
    - Base change (CP 2023 Q5: female 40% more than male, then male 40% more than female).
    - Discount and profit chain (CP 2024 Q6, CP 2025 Q7, CP 2022 Q5).
    - Context: cheese packet, ferry, calculator, souvenir, fan.
    - Verdict part: "gain or loss?" (CP 2025 Q7(c)).
  - **P6 Ratios and simultaneous equations with a given relation** (CP 2023 Q6, CP 2024 Q5, CP 2025 Q3, CP 2022 Q2). Trap: three-way ratio (a : b : c) then a combined expression.
  - **P7 Approximation / error: does the claim hold?** (CP 2023 Q3: mean of 250 packets vs a "nearest 10 g" definition.) Trap: compare ranges, not point values.
  - **P8 Variation: "partly constant and partly varies as x / x²"** (CP 2022 Q10, CP 2023 Q12, CP 2024 Q10, CP 2025 Q11). Set up y = k₁ + k₂ f(x) or y = k₁x + k₂x², solve two equations, then use the discriminant for "real roots", "two distinct real roots", or "range of k". Trap: non-zero constants stated explicitly in the answer.
  - **P9 Polynomials**
    - Remainder and factor theorem to find constants, then "number of rational / irrational roots? explain" (CP 2022 Q14, CP 2023 Q13, CP 2024 Q14, CP 2025 Q10).
    - Division with equal quotient and remainder (CP 2023 Q13). Trap: factorise the cubic and check roots one by one, so don't just state a count. A claim like "two irrational roots" needs the discriminant of the quadratic factor (CP 2022 Q14(c), CP 2024 Q14(b)(ii)).
  - **P10 Quadratic equations, roots, completing the square** (CP 2023 Q16, CP 2022 Q17, CP 2022 Q16, CP 2024 Q19, CP 2025 Q18). Roots sum/product; vertex by completion of the square; **translation / reflection / enlargement of a graph** (CP 2024 Q19(b); CP 2025 Q18(b); CP 2022 Q16(b)).
  - **P11 Exponential and logarithmic functions** (CP 2024 Q15 log-linear with base change; CP 2025 Q16 system with extraneous root; CP 2023 Q18 log AP). Traps: reject a root violating a stated condition (0 < x < y, CP 2025 Q16); change of base.
  - **P12 Arithmetic and geometric sequences** (CP 2025 Q17: T(9), T(47), T(199) geometric, then sum > 10⁶; CP 2022 Q17: AP of c², α² + β², 85; CP 2023 Q18; CP 2024 Q19(c)). Pattern: use the GP link to find d, then solve a quadratic inequality for n and **round up to the next integer** (CP 2025 Q17(b): 468; CP 2022 Q17(b): 470).
- **Measures, Shape and Space**
  - **S1 Geometry proof** (A(1) Q8): congruent (AAS, RHS, AAA) or similar (AAA) triangles with reasons in brackets (CP 2025 Q8, CP 2024 Q8, CP 2023 Q8, CP 2022 Q8). Part (b) uses the result. Verdict version: "is ΔBDE right-angled?" (CP 2023 Q8(b)).
  - **S2 Circle properties and angle chasing** (CP 2023 Q7: diameter, angles in the same segment).
  - **S3 Mensuration with similar solids** (A(2) Q13/14)
    - Cone with a parallel cut: cone X and frustum Y (CP 2023 Q14, CP 2025 Q14); pyramid and frustum (CP 2024 Q13); two spheres, melted into cones (CP 2022 Q13).
    - Trap: ratio of similar solids (area ratio k², volume ratio k³). A frustum's total surface area includes both circular ends (CP 2025 Q14(b)).
    - Final verdict: "are X and Z similar?" or "does the cube's surface area exceed...?" (CP 2024 Q13(b), CP 2025 Q14(c), CP 2022 Q13(b)).
  - **S4 3D trigonometry** (CP 2023 Q17 pyramid with equal edges; CP 2024 Q18 folded sheet; CP 2022 Q18 card held on the ground). Pattern: (a) plane trig (sine / cosine rule) gives lengths and angles, (b) finds a dihedral angle or a shortest distance, then a verdict ("exceeds 45°?" "exceeds 8 cm?" "exceeds 40°?").
  - **S5 Polar coordinates** (new: CP 2024 Q7). Three parts: angle POQ from the angle difference, collinearity from an angle of 180°, perimeter by Pythagoras. The same idea in MC: CP 2023 P2 Q24, CP 2022 P2 Q25.
  - **S6 Transformations in the coordinate plane** (rotation, reflection, translation, then collinearity or slope) (CP 2025 Q4, CP 2022 Q7).
  - **S7 Coordinate geometry of straight lines and locus** (CP 2023 Q10, CP 2025 Q13, CP 2024 Q17(a), CP 2024 Q12). Locus of equidistant points is the perpendicular bisector (1 mark), then the line's slope and equation, and a circle with AB as diameter.
  - **S8 Circle equation, tangent and chord** (CP 2023 Q16(b), CP 2024 Q17(b), CP 2025 Q19, CP 2022 Q19, CP 2022 Q12). Methods: complete the square or use general form, sub a line into the circle and use Δ = 0 for tangency (CP 2025 Q19(a)), or use radius ⊥ tangent. The circumcircle of the tangent-point triangle has the centre-to-external-point segment as diameter (CP 2024 Q17(b)(ii)).
  - **S9 Triangle centres** (CP 2023 Q19: circumcentre G, orthocentre H, in-centre I; CP 2025 Q18: orthocentre at the origin; CP 2022 Q19: incircle). Methods are perpendicular slopes or distance formulas; the final part is an area ratio or a claim.
- **Data Handling**
  - **D1 Table or stem-and-leaf with an unknown, then mean / median / mode / IQR / variance** (CP 2023 Q9, Q11; CP 2024 Q9, Q11; CP 2025 Q9, Q12; CP 2022 Q9, Q11). The unknown comes from range (CP 2023 Q9: range 27 gives a), IQR and median (CP 2022 Q11), mean (CP 2024 Q11, CP 2023 Q11), or a probability (CP 2024 Q9).
  - **D2 "Least / greatest possible" dispersion** (CP 2024 Q11(b)–(c): digits a, b limited to 0–9 so enumerate; CP 2025 Q9(a)–(c): median constraint gives 10 ≤ s ≤ 12, then compare SD at the ends; CP 2022 Q11(b)(ii)). These are enumeration questions.
  - **D3 Effects of adding or removing data** (CP 2023 Q11(b): two students with the mean value leave, range unchanged; CP 2022 Q11(b)(i): mode unchanged).
  - **D4 Box-and-whisker** (CP 2025 Q12(b): change in upper quartile; "less dispersed? explain").
  - **D5 Probability by combinations** (Q15 every year): CP 2022 Q15, CP 2023 Q15, CP 2024 Q16, CP 2025 Q15. Part (b) is a complement ("different", CP 2022 Q15(b); "at most 3 red", CP 2024 Q16(b)), three colours "all different" (CP 2025 Q15(b)) or a two-stage draw (CP 2023 Q15(b): the 2 balls enter a bag, then draw 3).
  - Grouped data with a cumulative frequency table (CP 2022 Q9: class boundaries 14.5, 19.5, ...).

### Typical contexts
- **Pure algebra or geometry; few real contexts.** Contexts in Paper 1: cheese packets and a ferry (CP 2023 Q3, Q5), calculator or souvenir pricing (CP 2024 Q6, CP 2025 Q7, CP 2022 Q5), workers' hours, researchers, athletes, football team ages, housewives and keys, students' pens or calculators (CP 2023 Q9, Q11; CP 2024 Q9, Q11; CP 2025 Q9, Q12; CP 2022 Q11), solid metal cone or pyramid melted and recast (CP 2023 Q14, CP 2024 Q13, CP 2025 Q14, CP 2022 Q13), coloured plates, balls, cups, or a committee (CP 2022–2025 Q15), a paper card or metal sheet for 3D (CP 2022 Q18, CP 2024 Q18).
- **Pure-math "framed" questions:** locus, circle and parabola in the rectangular plane, quadratic roots, sequences and logs, with no story.

### Common traps (built into stems)
- Percentage base switches mid-question (CP 2023 Q5).
- **"Reject" a solution that violates a stated condition** (CP 2025 Q16: y = 1/27 gives an impossible x; CP 2023 Q18: 1 < α < β).
- Multiple digit solutions: "a and b are digits" gives several pairs (CP 2024 Q11).
- **Unknown count constrained by a median or range** (CP 2025 Q9, CP 2023 Q9).
- **Claim questions need a number, not a feeling** (CP 2023 Q3: 214.4 g rounds to 210 g, not 220 g).
- 3D: use the right triangle's slant height or projection, not the vertical height; the dihedral angle needs a perpendicular to the common line (CP 2024 Q18(b), CP 2022 Q18(b)).
- Quadratic inequality: round **up** for "least n" (CP 2025 Q17(b), CP 2022 Q17(b)).
- Final-answer accuracy: "correct to 3 significant figures" is written in the script (CP 2023 Q14(b)(ii): 23.1 cm; CP 2023 Q17(a): 51.5°).
- Exact form requested: "in terms of π" (CP 2023 Q12(b), Q14; CP 2025 Q14), "in surd form" (CP 2025 Q19(b)(ii)).

---

## 4. Marking conventions (inferred from the scripts; not official)

- **Mark types** (inferred): M for method, A for accurate answer. Parts in the printed paper show only a total, e.g. "(3 marks)".
- **Parts and allocation.** The printed mark is for the whole part; a typical 3-mark substitution-solve split is 1M (setup), 1M (solve) and 1A.
- **Working shown is expected:** setting up unknowns ("Let a be the number of male passengers", CP 2023 Q5), naming equations (①, ②), and writing the substitution. The strong scripts always do this.
- **Geometry proofs with reasons.** Each statement carries a reason in brackets: "(alt. ∠s, AC // DB)", "(vert. opp. ∠s)", "(∠ sum of Δ)", "(A.A.A.)", "(RHS)", "(corr. sides, ~Δs)". Congruence is named with the criterion (AAS, RHS). The converse of Pythagoras is used to show a triangle is not right-angled (CP 2023 Q8(b)).
- **Verdict parts:** show the comparison (e.g. 5284 < 5428) and a one-line conclusion ("It does not exceed"). A bare yes/no with no calculation presumably earns 0 (inferred).
- **Accuracy:** answers not exact are given to 3 s.f. with the phrase "corr. to 3 sig. fig." (CP 2023 Q14(b)(ii), Q17(a)). Exact values (π, surds, fractions) are kept when requested. Premature rounding is avoided by the strong candidates (calculator values carried).
- **"Hence" and follow-through:** later parts depend on earlier ones; the strong candidates reuse the earlier result (CP 2023 Q16(b) uses 5a² = 36b). Follow-through marking is presumably allowed (inferred).
- **Units and labels:** units for lengths, areas and volumes (cm, cm², cm³). Coordinates are written as ordered pairs.
- **Interval and integer answers:** inequality answers are written as intervals ("-9/2 < x < 3"), and counts are stated as integers.
- **Equation of a line / circle:** any equivalent form accepted (inferred); the strong scripts give general form (e.g. x - 3y - 14 = 0).
- **Rejecting roots** must be written explicitly ("(rej.)", CP 2025 Q16).

---

## 5. Generator recipe (summary)

1. **Paper 1.**
   - Use the 105-mark skeleton: A(1) = 9 questions, A(2) = 5, B = 5, with the mark patterns in §1.
   - Pick one archetype per slot. A(1): algebra ×3 → inequality / percentage / ratio / small coordinate item → proof → data. A(2): variation → statistics → coordinate/locus → solids → polynomial (order may be shuffled). B: probability → short log or quadratic → sequence or 3D → harder 3D or vertex question → a 12-mark coordinate geometry question.
   - For every multi-part question, chain the parts: (a) produces a number, relation or proof that (b) needs. Add a final verdict part ("explain", "is the claim correct") for about one question in three.
   - Choose clean numbers: factors that give integer or simple surd answers (e.g. 24, 18, 10-24-26 triples), and verify by solving.
   - Put a trap in every question (§3).
   - Write the model solution in M/A form with brackets for reasons in geometry, and a plain-language rubric: "set up", "solve", "conclude".
2. **Paper 2 MC.**
   - 45 items: Section A 14 / 13 / 3 (Number & Algebra / Measures, Shape & Space / Data), Section B 7 / 4 / 4, in the order of §1.
   - Include 6–7 (I)(II)(III) items, about 12 figure items, and about 25 calculation items.
   - Build each distractor from a named slip in the §2 table, record the slip, and give options in ascending order.
   - Balance the answer letters across the 45 items.
3. **Verification.**
   - Numeric answers go through the existing mathjs checker; MC keys come from the same code that builds the distractors.
   - Proof and "explain / verdict" parts are flagged for teacher review (no automatic check).
   - Figures need either a drawing or a coordinate set that the checker can reproduce.
4. **Open items for the teacher.**
   - Confirm Section A / B = Foundation / non-foundation.
   - Confirm the polar-coordinates and transformation items are in scope for the 2024+ syllabus.
   - Replace the inferred marking conventions in §4 with the official marking scheme.
   - Tag archetypes with `CP-<unit>` IDs once `math-compulsory.md` exists.
