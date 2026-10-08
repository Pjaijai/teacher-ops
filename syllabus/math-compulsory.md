# HKDSE Mathematics Compulsory Part — exam format and syllabus

Status: **draft v0.1 (2026-10-07), awaiting review by a Maths teacher.**

How this file is sourced:
- **Verified** parts come straight from the documents in the Sources table (the 2029 assessment framework, the December 2017 Curriculum and Assessment Guide in English and Chinese). Foundation / Non-foundation marking comes from the underlining in the English guide's PDF, which we detected programmatically (see "Verified vs inferred").
- **Inferred** parts are our own conventions or recollection. They're marked *inferred*.


## Sources

| Short name | Document | URL |
|---|---|---|
| CA Guide (EN) | EDB/HKEAA, *Mathematics Curriculum and Assessment Guide (Secondary 4–6)*, with updates December 2017 (chapter 2: learning content) | https://www.edb.gov.hk/attachment/en/curriculum-development/kla/ma/curr/CA_2017_e.pdf |
| CA Guide (ZH) | 《數學課程及評估指引（中四至中六）》 (Dec 2017 update), source of the Chinese unit names | https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/ma/curr/CA_2017_tc.pdf |
| AF 2029 | HKEAA, 2029 HKDSE Mathematics assessment framework (Compulsory Part, M1, M2) | https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/math/2029hkdse-e-math-gh8.pdf |
| EDB M1/M2 slides | EDB Mathematics Education Section, *The Extended Part of Mathematics (M1/M2)* ("applicable to the 2028 HKDSE and onwards") | https://amp.edb.edcity.hk/doc/eng/M1_M2.pdf |
| EDB enhanced measures | EDB, Ongoing renewal of the Senior Secondary Curriculum (M1/M2 enhanced measures) | https://edb.gov.hk/en/curriculum-development/kla/ma/optimising_measures_ep.html |
| 2027 changes | HKEAA, Notes on changes to HKDSE assessment frameworks for 2027 (Mathematics is not listed) | https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/NotesChangesAFs2027-e-rev1.pdf |

## 1. Exam structure (verified from the 2029 framework unless marked)

| Component | Weighting | Time | Contents |
|---|---|---|---|
| Paper 1 (conventional questions) | 65% | 2¼ h | All questions compulsory, in three parts: **Section A(1)** 35 marks, 8–11 elementary questions; **Section A(2)** 35 marks, 4–7 harder questions; **Section B** 35 marks, 4–7 questions. Total 105 marks (*inferred* sum). |
| Paper 2 (multiple choice) | 35% | 1¼ h | All questions compulsory. **Section A** = ⅔ of the paper mark; **Section B** = ⅓. |
| SBA | none | — | No school-based assessment component appears in the framework. |

- **What each section covers:**
  - Paper 1 Section A, and Paper 2 Section A: **Foundation Topics** of the Compulsory Part plus the Foundation Topics of Secondary 1–3.
  - Paper 1 Section B, and Paper 2 Section B: the **whole** Compulsory Part (Foundation and Non-foundation Topics) plus S1–3 Foundation and Non-foundation Topics.
  - So a student who only masters Foundation Topics can reach Level 4 (per EDB wording in the enhanced-measures material).
- **Notes in the framework:** no lengthy manipulations; answers to appropriate accuracy; calculators and drawing instruments allowed; SI/metric units; common notations are listed in the framework.
- **Number of MC questions in Paper 2:** 45 questions (30 in A, 15 in B) at 1 mark each is *inferred* from past papers; the framework only gives the ⅔ : ⅓ split. Unverified.
- **2025+ changes:** none found for the Compulsory Part. HKEAA's "Notes on changes to HKDSE assessment frameworks for 2027" (revised May 2026) lists Geography, Literature in English and Music only. The 2029 framework matches the structure above. The Compulsory Part was also covered by the 2021 optimisation of the four core subjects; we did **not** manage to open EDB's "Optimising 4 SS Core Subjects — Mathematics" document (URL returned 404), so any content trimmed by that exercise is *unverified*. The unit list below is the December 2017 guide.
- **Syllabus size:** 250 suggested hours (up to 313 for slower learners). Units 1–18 cover content; unit 19 (Further applications) and 20 (Inquiry and investigation) are further learning units.

## 2. Foundation vs Non-foundation

The guide underlines Non-foundation Topics (NFT). Everything not underlined is a Foundation Topic (FT). In this file:
- `[FT]` unit: all objectives are Foundation.
- `[NFT]` unit: all objectives are Non-foundation (examined only in Section B).
- `[mixed]` unit: some objectives of each kind; the objective lines say which.
- Where a single objective splits (9.1, 14.2), the text says which part is NFT.

In the JSON, `foundation` is `"FT"`, `"NFT"`, `"mixed"` or `"n/a"` (unit 20).

## 3. Learning Unit tree

**IDs:** `CP-<official unit number>` for a unit (e.g. `CP-7`); objectives are `CP-<unit>.<n>` using the guide's own numbering, so they are stable. Strand names and unit names are the guide's. Suggested lesson hours are the guide's and are for reference only. Machine-readable copy: [math-compulsory.json](math-compulsory.json).

### Number and Algebra

**CP-1 Quadratic equations in one unknown 一元二次方程** [mixed FT/NFT] — suggested 19 h
- CP-1.1 FT Solve quadratic equations by factorisation.
- CP-1.2 FT Form a quadratic equation from given (real) roots.
- CP-1.3 FT Solve ax²+bx+c=0 by reading x-intercepts from the parabola's graph.
- CP-1.4 FT Solve quadratic equations with the quadratic formula.
- CP-1.5 FT Relate the discriminant to the nature of the roots.
- CP-1.6 FT Solve real-life problems leading to quadratic equations.
- CP-1.7 NFT Use the sum and product of roots (-b/a, c/a) and form equations from them.
- CP-1.8 FT Appreciate how number systems developed, including complex numbers.
- CP-1.9 NFT Add, subtract, multiply and divide complex numbers (form a+bi).
- *Not required / note:* Foundation-only candidates need not express non-real roots as a±bi or simplify surds like 2√48 in 1.4.
- *Not required / note:* Coefficients are real; for a negative discriminant say 'no real roots' / 'two non-real roots'.

**CP-2 Functions and graphs 函數及其圖像** [mixed FT/NFT] — suggested 10 h
- CP-2.1 FT Recognise intuitively functions, domain and co-domain, independent and dependent variables.
- CP-2.2 FT Use function notation; represent functions in tables, algebraically and graphically.
- CP-2.3 FT Describe features of quadratic graphs (vertex, axis, direction, axis intercepts); read max/min from the graph.
- CP-2.4 NFT Find max/min of a quadratic algebraically by completing the square, and solve related problems.

**CP-3 Exponential and logarithmic functions 指數函數與對數函數** [NFT] — suggested 16 h
- CP-3.1 NFT Understand definitions of rational indices.
- CP-3.2 NFT Apply the laws of rational indices.
- CP-3.3 NFT Understand logarithms and their laws, including change of base.
- CP-3.4 NFT Know properties and graph features of exponential and logarithmic functions (domain, monotonicity, symmetry about y=x, intercepts).
- CP-3.5 NFT Solve exponential and logarithmic equations.
- CP-3.6 NFT Appreciate real-life uses of logarithms (e.g. Richter scale, decibels).
- CP-3.7 NFT Appreciate the historical development of logarithms.
- *Not required / note:* Equations reducible to quadratics (e.g. 4^x-3*2^x-4=0) belong to 5.3.

**CP-4 More about polynomials 續多項式** [mixed FT/NFT] — suggested 14 h
- CP-4.1 FT Divide polynomials (long division or other methods).
- CP-4.2 FT Understand the remainder theorem.
- CP-4.3 FT Understand the factor theorem; factorise e.g. x³-a³.
- CP-4.4 NFT Understand H.C.F. and L.C.M. of polynomials.
- CP-4.5 NFT Add, subtract, multiply and divide rational functions.
- *Not required / note:* Rational functions with more than two variables are not required.

**CP-5 More about equations 續方程** [NFT] — suggested 10 h
- CP-5.1 NFT Solve a linear + quadratic (y=ax²+bx+c) pair of simultaneous equations graphically.
- CP-5.2 NFT Solve a linear + quadratic pair algebraically.
- CP-5.3 NFT Solve equations reducible to quadratics: fractional, exponential, logarithmic, trigonometric (0 to 360 degrees).
- CP-5.4 NFT Solve problems leading to such equations.

**CP-6 Variations 變分** [FT] — suggested 7 h
- CP-6.1 FT Understand direct and inverse variation and apply to real-life problems.
- CP-6.2 FT Understand graphs of direct and inverse variation.
- CP-6.3 FT Understand joint and partial variations and apply them.

**CP-7 Arithmetic and geometric sequences and their summations 等差數列與等比數列及其求和法** [NFT] — suggested 17 h
- CP-7.1 NFT Understand the concept and properties of arithmetic sequences.
- CP-7.2 NFT Understand the general term of an arithmetic sequence.
- CP-7.3 NFT Understand the concept and properties of geometric sequences.
- CP-7.4 NFT Understand the general term of a geometric sequence.
- CP-7.5 NFT Use formulae for the sum of finitely many terms of arithmetic and geometric sequences.
- CP-7.6 NFT Explore the sum to infinity of suitable geometric sequences and use it.
- CP-7.7 NFT Solve real-life problems (interest, growth, depreciation).

**CP-8 Inequalities and linear programming 不等式與線性規畫** [mixed FT/NFT] — suggested 16 h
- CP-8.1 FT Solve compound linear inequalities in one unknown ('and'/'or'), including triangle-inequality problems.
- CP-8.2 FT Solve quadratic inequalities in one unknown graphically.
- CP-8.3 NFT Solve quadratic inequalities in one unknown algebraically.
- CP-8.4 NFT Graph linear inequalities in two unknowns on the coordinate plane.
- CP-8.5 NFT Solve systems of linear inequalities in two unknowns.
- CP-8.6 NFT Solve linear programming problems.

**CP-9 More about graphs of functions 續函數圖像** [mixed FT/NFT] — suggested 11 h
- CP-9.1 FT+NFT Sketch and compare graphs of constant, linear, quadratic, trigonometric (FT) and exponential/logarithmic (NFT) functions: domain, extrema, symmetry, periodicity.
- CP-9.2 FT Solve f(x)=k using the graph of y=f(x).
- CP-9.3 FT Solve f(x)>k, <k, >=k, <=k using the graph of y=f(x).
- CP-9.4 NFT Understand transformations f(x)+k, f(x+k), kf(x), f(kx) in table, symbolic and graph forms.


### Measures, Shape and Space

**CP-10 Equations of straight lines 直線方程** [FT] — suggested 7 h
- CP-10.1 FT Find the equation of a line from two points, slope+point, or slope+intercept; read slope, intercepts and point-membership from an equation; relate slope and inclination.
- CP-10.2 FT Determine how two straight lines can intersect (number of intersection points).
- *Not required / note:* Normal form of a line is not required.
- *Not required / note:* Teaching suggestion: first term of S4.

**CP-11 Basic properties of circles 圓的基本性質** [mixed FT/NFT] — suggested 23 h
- CP-11.1 FT Chord and arc properties (equal arcs/chords, perpendicular from centre bisects chord, equidistance); one circle through 3 non-collinear points.
- CP-11.2 FT Angle properties (angle at centre = 2x angle at circumference, same segment, semicircle).
- CP-11.3 FT Properties of cyclic quadrilaterals (opposite angles supplementary, exterior angle).
- CP-11.4 NFT Tests for concyclic points and cyclic quadrilaterals.
- CP-11.5 NFT Tangent properties and the alternate segment theorem (and its converse).
- CP-11.6 NFT Use circle properties in simple geometric proofs (Key Stage 3 geometry may be used).

**CP-12 Loci 軌跡** [FT] — suggested 6 h
- CP-12.1 FT Understand the concept of a locus.
- CP-12.2 FT Describe and sketch loci from geometric conditions (fixed distance from a point/line, equidistant from two points/parallels/intersecting lines).
- CP-12.3 FT Describe loci with equations: lines, circles, parabolas y=ax²+bx+c.

**CP-13 Equations of circles 圓方程** [mixed FT/NFT] — suggested 7 h
- CP-13.1 FT Find the equation of a circle (centre+radius, or three points); read centre, radius and point position (inside/on/outside).
- CP-13.2 NFT Find intersections of a line and a circle, determine how they can meet, find tangent equations.

**CP-14 More about trigonometry 續三角學** [mixed FT/NFT] — suggested 25 h
- CP-14.1 FT Sine, cosine, tangent functions: graphs, max/min, periodicity; simplify expressions with angles such as 90°±θ, 180°±θ.
- CP-14.2 FT+NFT Solve a sinθ=b, a cosθ=b, a tanθ=b for 0° to 360° (FT); other trigonometric equations in that range (NFT).
- CP-14.3 NFT Area of triangle = ½ab sin C.
- CP-14.4 NFT Sine and cosine formulae.
- CP-14.5 NFT Heron's formula.
- CP-14.6 NFT Concept of projection.
- CP-14.7 NFT Angle between a line and a plane; between two planes (inclination).
- CP-14.8 NFT Theorem of three perpendiculars.
- CP-14.9 NFT Solve 2-D and 3-D problems (angles between lines/planes, distances point-point, point-line, point-plane).


### Data Handling

**CP-15 Permutations and combinations 排列與組合** [NFT] — suggested 11 h
- CP-15.1 NFT Addition and multiplication rules of counting.
- CP-15.2 NFT Concept and notation of permutation (nPr).
- CP-15.3 NFT Permutations of distinct objects without repetition (e.g. three particular objects together).
- CP-15.4 NFT Concept and notation of combination (nCr).
- CP-15.5 NFT Combinations of distinct objects without repetition.
- *Not required / note:* Circular permutation is not required.

**CP-16 More about probability 續概率** [NFT] — suggested 10 h
- CP-16.1 NFT Set notation (union, intersection, complement) and Venn diagrams.
- CP-16.2 NFT Addition law P(A∪B)=P(A)+P(B)-P(A∩B); mutually exclusive and complementary events.
- CP-16.3 NFT Multiplication law for independent events.
- CP-16.4 NFT Conditional probability; P(A∩B)=P(A)P(B|A).
- CP-16.5 NFT Use permutations/combinations in probability problems.
- *Not required / note:* Bayes' Theorem is not required.

**CP-17 Measures of dispersion 離差的度量** [mixed FT/NFT] — suggested 13 h
- CP-17.1 FT Concept of dispersion.
- CP-17.2 FT Range and inter-quartile range.
- CP-17.3 FT Construct and interpret box-and-whisker diagrams; compare distributions.
- CP-17.4 FT Standard deviation for grouped and ungrouped data; variance = SD².
- CP-17.5 FT Compare dispersion of data sets using suitable measures.
- CP-17.6 NFT Apply SD to standard scores and the normal distribution.
- CP-17.7 NFT Effect on dispersion of adding a constant or multiplying by a constant.

**CP-18 Uses and abuses of statistics 統計的應用及誤用** [FT] — suggested 4 h
- CP-18.1 FT Sampling techniques (probability vs non-probability), population/sample, questionnaire design principles.
- CP-18.2 FT Discuss uses and abuses of statistics in daily life.
- CP-18.3 FT Assess statistical investigations in news media and reports.


### Further Learning Unit

**CP-19 Further applications 進階應用** [not marked] — suggested 14 h
- CP-19.1 Solve more sophisticated real-life/mathematical problems needing information search, strategy exploration or integration of several areas (e.g. tax/instalments, survey data, graphs, Ptolemy's and Ceva's theorems, reducing y=m√x+c and y=k·a^x to linear relations, Fibonacci/golden ratio, cryptography, games).
- *Not required / note:* Cross-cutting; no FT/NFT underlining in the guide, but examples draw on NFT content.

**CP-20 Inquiry and investigation 探索與研究** [not marked] — suggested 10 h
- CP-20.1 Discover and construct knowledge through learning activities; build inquiry, communication, reasoning and conceptualisation skills.
- *Not required / note:* Not an independent unit: time is drawn from other units. Not directly examinable as a topic.

## 4. Verified vs inferred

**Verified (read in the sources):**
- Paper structure, marks, times and weightings in section 1 (2029 framework).
- Unit numbers, English names, objectives, remarks and suggested hours (English guide, chapter 2.5).
- Chinese unit names (Chinese guide, same unit numbering; names re-assembled from line-wrapped text, e.g. 續多項式 is the guide's own wording for "More about polynomials").
- Foundation / Non-foundation status: the English guide's PDF underlines NFT objectives. We extracted the underlines from the PDF drawing data and matched them to objective numbers. Spot-check against the printed guide recommended.

**Inferred / unverified:**
- Paper 2's 45-question split and paper totals (105 marks for Paper 1 is a sum).
- Objective texts are condensed paraphrases of ours, not quotations.
- The `foundation` value for units 19 and 20 (the guide doesn't underline anything there).
- Objective 1.8 (number systems, including complex numbers) is not underlined in the guide, so it's marked FT even though 1.7 and 1.9 are NFT. Worth a teacher's eye.
- No prerequisites have been entered yet; `prerequisites` is empty in the JSON.
- S1–3 content (also examined in Papers 1 and 2) is not part of this file.
