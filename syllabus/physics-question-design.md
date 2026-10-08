# HKDSE Physics — how the questions are built

Status: **draft v0.1 (2026-10-07), awaiting review by a Physics teacher.**

These notes are distilled from the HKDSE papers, marking schemes and examiners' reports in `paper/physics/` (unofficial mirror copies, git-ignored):
- **Paper 1A (MC):** all 264 questions, 2016–2023.
- **Paper 1B (long questions):** 2019, 2020, 2021, 2023 in full, plus part of 2016.
- **Paper 2 (electives):** 2019–2023.
- **Examiners' reports:** 2012–2021.

Citations look like `2023 1A Q7` (2023, Paper 1A, Q7). Topic IDs are from [physics.md](physics.md).

Caveats:
- MC keys are official for 2017, 2018, 2019, 2021 and 2023. We solved 2016, 2020 and 2022 ourselves. The least certain are 2020 Q1, Q11, Q17 and 2016 Q18, Q29.
- 2018 1A Q1 was deleted by HKEAA.
- The 2021 and 2022 files were read with a workaround, because our renderer used to drop text stored as CCITT/JBIG2 image masks. That's now fixed in `scripts/render-pdf.mts` with pdfjs's `wasmUrl`.

---

## 1. Paper 1A — multiple choice

### Paper blueprint
- **33 questions in syllabus order, blocks never interleaved:** Heat → Force & Motion → Waves → E&M → Nuclear.
- **Questions per topic by year:**

  | Year | Heat | F&M | Wave | E&M | Nuclear | `*` |
  |---|---|---|---|---|---|---|
  | 2016 | 3 | 11 | 9 | 8 | 2 | 8 |
  | 2017 | 4 | 9 | 8 | 9 | 3 | 10 |
  | 2018 | 4 | 9 | 8 | 9 | 3 | 7 |
  | 2019 | 3 | 10 | 9 | 8 | 3 | 7 |
  | 2020 | 3 | 7 | 11 | 8 | 4 | 7 |
  | 2021 | 3 | 6 | 11 | 10 | 3 | 6 |
  | 2022 | 3 | 11 | 8 | 8 | 3 | 9 |
  | 2023 | 3 | 10 | 9 | 8 | 3 | 6 |

  **Generator default: 3 / 10 / 9 / 8 / 3**, with **6–9 `*` (extension) items** placed at the hard end of each block. The answer letters are balanced, about 8 each.
- **Difficulty resets in each block; it doesn't climb through the paper.** Each block opens with an easy item (2023 Q14 88%, 2017 Q1 86%).
  - Recall items: 70–90% correct.
  - Two-step calculations: 45–65%.
  - **Concept traps are the hardest, at 20–40%.** For example:
    - 2018 Q4 (11%): p–1/V line with an intercept.
    - 2018 Q6 (21%): direction of a hinge reaction.
    - 2023 Q28 (30%): a kWh meter measures energy, not power.
    - 2021 Q5 (35%): the contact force from an incline is vertical.
- **About 24 of 33 items have a figure.**

### Formats per paper
- **Statement items, (1)(2)(3):** 7–12.
- **Calculations:** 7–11.
- **Two-column "X / Y" tables:** 3–9.
- **Choose the graph or picture:** 2–5.
- **Single correct or INCORRECT statement:** 3–9. Use the capitalised INCORRECT stem 1–2 times.
- **Ratio or symbolic answers:** 1–4.

**Statement items** use two fixed option menus:
- **M1:** (1) only / (3) only / (1)&(2) / (2)&(3)
- **M2:** (1)&(2) / (1)&(3) / (2)&(3) / all three

Each set has one true core fact, one classic misconception, and **one subtle statement that decides the answer**.
- **The modal word is the lever:**
  - "must be" knocks out things that are only sometimes true (2023 Q31, 2018 Q15, 2021 Q18).
  - "can be" tests multiple solutions (2022 Q15).
  - "always" tests universal properties (2023 Q20).
- **Famous exceptions are favoured:** ice→water separation decreases (2022 Q2); a velocity selector is independent of charge sign (2022 Q29); an open-circuit moving rod feels no opposing force (2021 Q26).

**Two-column tables:** one column is qualitative (direction, type, same/different) and the other is a value (correct vs one slip). The four rows cover every combination. Example: 2023 Q7, due west/east × g tan20° vs g sin20°.

### Distractor recipe: one named slip per wrong option
Two independent slips give a 2×2 grid: the key plus three distractors. Record the misconception behind each one.

| Slip | Examples |
|---|---|
| Inverted ratio / forgot the square | 2020 Q10 (2.3/9.2/10.4/41.7 m s⁻²), 2018 Q25, 2023 Q3 |
| °C instead of K | 2020 Q3, 2022 Q3, 2016 Q3 |
| Wrong trig, or angle from the surface instead of the normal; angles printed in the figure used as distractors | 2023 Q7, 2018 Q17, 2021 Q13 (37°, 53°, 60°) |
| Half-angle × order (grating) | 2021 Q17 |
| Counting fringes or crests (n vs n−1); reading a phase-shifted graph | 2023 Q17, 2021 Q11 |
| Stopping at an intermediate quantity | 2023 Q2 (J vs J kg⁻¹), 2022 Q25 (C vs number of electrons) |
| Leaving out exactly one term | 2019 Q12 (Atwood: forget KE / forget GPE / free fall), 2023 Q32, 2022 Q33 |
| Peak vs r.m.s. vs peak-to-peak | 2023 Q29, 2021 Q28 |
| Unit slips (min→s, mA h, W vs kW) | 2023 Q15, 2020 Q25, 2016 Q28 |
| Mixing lengths (rod l vs rail spacing d) | 2017 Q28 |
| Reversed direction / wrong-hand rule / prism order used for a grating | 2023 Q7, Q30, Q18 |
| Linear instead of exponential decay | 2021 Q32 |
| One shared wrong principle behind every distractor | 2022 Q19 |
| **"Cannot be determined because X is unknown"** | 8 items, **never the key**; the quantity always cancels |
| Red herrings (incline angle, friction, a.c. frequency, mAh) | 2017 Q6, 2022 Q10, 2022 Q30, 2020 Q25 |

### Numbers
- **Answers come out exact,** e.g. 2000 W × 168 s = 1 × 4200 × 80 (2020 Q2).
- **Pythagorean geometry:** 60-80-100 (2016 Q5).
- **A coincidence makes the key insight click:** 11 cos27° ≈ 9.81 (2019 Q6); exact half-life multiples (2019 Q32).
- **Threshold traps:** heat just short of melting all the ice, so the key is 0 °C (2016 Q2).
- **Symbolic keys are common:** 6mgh, mg tanθ.
- **Options are in ascending order.** Near-miss calculations sit about 5% apart; unit slips are orders of magnitude apart.

### Archetypes by topic (each cited)
- **I Heat:**
  - Heat-transfer recall (2023 Q1).
  - Heating curve plateau × power (2023 Q2, 2021 Q1).
  - Mixtures (2017 Q1, 2022 Q1).
  - Internal energy KE/PE (2019 Q2, 2022 Q2).
  - `*` p–T or p–V graphs (2023 Q3, 2020 Q3).
  - `*` Kinetic theory (2021 Q3).
- **II F&M:**
  - Distance vs displacement (2023 Q4).
  - v–t area (2021 Q7).
  - Equilibrium: strings, incline, resultant contact force (2023 Q5–6, 2021 Q5).
  - Newton's 3rd-law pairs (2021 Q4).
  - Accelerometer bob and apparent weight (2023 Q7–8).
  - Connected bodies (2023 Q9, 2019 Q12).
  - Energy graphs (2023 Q10).
  - Momentum components and decay recoil (2023 Q11, 2021 Q8).
  - Metre rule with its own weight (2023 Q12).
  - `*` Projectiles (2023 Q13).
  - `*` Circular motion and gravitation (2021 Q9, 2020 Q10, 2022 Q14).
- **III Waves:**
  - λ or T from graphs (2023 Q14, 2021 Q11).
  - Seismic P/S waves (2023 Q15, 2021 Q12).
  - Refraction ranking and critical angle (2023 Q16, 2021 Q13).
  - Stationary waves (2021 Q15).
  - Two-source path difference (2023 Q19).
  - `*` Double slit (2023 Q17).
  - `*` Grating (2021 Q17).
  - Lenses on a grid (2023 Q21, 2021 Q18).
  - EM spectrum and sound (2023 Q22).
- **IV E&M:**
  - Charge sharing (2021 Q21).
  - Three charges (2023 Q23).
  - Field-line ranking (2023 Q24).
  - `*` Field superposition (2021 Q22).
  - Opposing e.m.f.s and network power (2023 Q25–26).
  - R ∝ ρl/A (2021 Q24).
  - Null point between two wires (2021 Q25).
  - Jumping ring / Lenz (2023 Q27).
  - Domestic electricity (2023 Q28).
  - `*` Transformer with r.m.s. (2023 Q29).
  - `*` r = mv/qB (2023 Q30).
  - `*` Velocity selector (2022 Q29).
- **V Nuclear:**
  - "Must be" half-life statements (2023 Q31).
  - Back-calculating activity (2021 Q32).
  - Counting α and β (2021 Q31).
  - Radiation properties (2021 Q33).
  - `*` Mass–energy (2023 Q32).
  - Fission and fusion facts (2023 Q33).

## 2. Paper 1B — long questions

### Format
- **84 marks over 9–10 questions of 5–14 marks**, all compulsory, in a fixed topic order:
  - Q1 Heat
  - Q2 Gases, usually `*`
  - Q3–5 Force and motion
  - about 2 waves/optics questions
  - 2–3 electricity and magnetism questions
  - **the last question is radioactivity/nuclear, 5–7 marks**
- **About 70% have a real-life context.** There are **1–2 "Read the following passage…" questions** each year (a 100–200-word box, then 4–6 parts): eddy currents 2021 Q7, maglev 2020 Q3, life nets 2019 Q3, rainbows 2023 Q6.
- **Mark mix:** about 45–55% calculation, 25–35% explanation, 10–20% drawing or graphs.

### Question anatomy
**New information is released between parts**, e.g. wonton soup → soup container (2020 Q1). The usual escalation:
1. A 1–2 mark recall or figure label.
2. A 2–3 mark core calculation.
3. A "hence" calculation (an e.c.f. chain).
4. A 2-mark "explain whether / greater, equal or smaller".
5. Sometimes, judging someone's suggestion.

| Command word | Marks |
|---|---|
| State / Name / Which | 1A |
| Find / Calculate / Estimate | 2 (1M+1A); 3 (1M+1M+1A or 2M+1A) for two physics steps |
| Show that … | M marks only; it gives later parts their number |
| Hence … | 2, e.c.f. allowed |
| Explain / Is X >, = or < Y? | 2 = verdict + reason (or 2 linked points); 3 = verdict + 2 causal steps |
| Indicate / label / draw on the figure | 1A per correct element |
| Sketch / complete a graph | 2A: shape + key feature |
| Ray diagram on a grid | 3–5: construction M + result A |
| Describe the procedure / precautions | 1A per step, 5–6 in total |
| Suggest an improvement | 1A |

**Traps built into stems:**
- forgetting the weight in an impulse problem (2019 Q3);
- gauge vs absolute pressure (2020 Q2, 2023 Q2);
- n crests = n−1 wavelengths (2019 Q5);
- forgetting the container's heat capacity (2020 Q1);
- suvat on a curved track, which is not accepted (2020 Q4);
- wire length inside the field (2023 Q8);
- an anomalous reading to discard (2020 Q6);
- "linear" vs "proportional" (2023 Q8, 2019 Q7).

### Archetypes by topic (each cited)
- **Heat and gases**
  - **H1 Method of mixtures.** Find the unknown, then the direction of the error, then judge a suggested improvement (2021 Q1, 2023 Q1, 2019 Q1, 2016 Q1).
  - **H2 Heater power equals rate of heat loss.** Then a cooling-rate argument (2020 Q1).
  - **H3 Heat-transfer features of a product** (2019 Q1).
  - **G1 Gas-law chain in a device.** pV = nRT → p after a change → force = Δp·A (water rocket 2023, diver cylinder 2021, steam catapult 2020, weather balloon 2019).
  - **G2 Kinetic-theory explanation, 2 marks, every year.** Speed/KE or number density → collision frequency and violence → rate of change of momentum → pressure.
- **Mechanics**
  - **M1 Projectile in a sport or rescue** (2021 Q3, 2020 Q4, 2019 Q3).
  - **M2 Longer impact time → smaller force.** A 2-mark item **almost every year** (2021 Q3d, 2023 Q3d, 2019 Q3).
  - **M3 Newton's 2nd law with a free-body diagram,** then "T >, = or < mg? explain" (2021 Q4, 2020 Q5, 2016 Q3).
  - **M4 v–t graph with reaction time and stopping distance** (2023 Q3, 2016 Q3).
  - **M5 P = Fv and W = ΔKE** (2023 Q3, 2020 Q2).
  - **M6 Thrust from Δp/Δt plus the 3rd law** (2021 Q5, 2023 Q2).
  - **M7 Identify the centripetal provider;** rev/min ↔ ω (2023 Q4, 2019 Q4, 2020 Q4).
  - **M8 Gravitation:** "show r ≈ 42 000 km" for a geostationary orbit (2021 Q5); the moon's speed is constant because the force is perpendicular to v (2019 Q4).
- **Waves and optics**
  - **W1 Reading wave diagrams:** ripple tank (2019 Q5); longitudinal particle positions (2023 Q5).
  - **W2 Refraction and critical angle, with a dispersion explanation:** optical fibre (2020 Q7); rainbow droplet (2023 Q6); f unchanged in glass (2021 Q6).
  - **W3 Lens on a grid.** Type, F by construction, f with an accepted range of ±1 grid square, magnification, chromatic aberration (2021 Q6, 2019 Q6).
  - **W4 Speed of sound** by echo or two microphones (2021 Q2, 2020 Q6).
- **Electricity and magnetism**
  - **E1 Switch networks:** lit or shorted, current directions, equivalent R, power, **fuse suitability** (2020 Q8, 2023 Q7, 2021 Q8).
  - **E2 Domestic electricity:** L/N/E, parallel wiring, fuse choice, kWh cost (2019 Q8, 2021 Q7).
  - **E3 Field between plates:** field lines, E = V/d, couple (2020 Q9).
  - **E4 Current balance experiment** (2023 Q8).
  - **E5 Induction and Lenz:** flux linkage NBA, eddy-current loop (2019 Q9); eddy-current braking passage (2021 Q7); maglev (2020 Q3).
- **Nuclear (the last question)**
  - **R1 Count α and β in a series** (2023, 2016, 2021).
  - **R2 Half-life and A = λN** (2023, 2019, 2021).
  - **R3 Everyday radiation-safety judgement:** bananas, thoriated lenses (2021, 2023).
  - **R4 Mass defect × 931 MeV;** chain-reaction conditions (2020, 2019).

### Experiment questions: at least one every year
- **Design type (5–6 marks).** Each element is about 1A:
  - set-up or circuit, including meter polarity;
  - measuring steps (vary, record, repeat);
  - formula;
  - 1–2 precautions.
  **A change of apparatus is not a precaution.** Examples: 2019 Q7, 2016 Q1.
- **Given set-up or data type (6–11 marks).** Sub-tasks:
  - mark a polarity or position;
  - say what extra apparatus is needed;
  - **discard the anomalous reading, then average**;
  - gradient → **hence** an unknown;
  - **linear vs directly proportional**;
  - explain a non-zero intercept;
  - suggest one improvement;
  - give the direction of a systematic error;
  - judge a peer's suggestion.
  Examples: 2020 Q6, 2021 Q4, 2023 Q8, 2021 Q1.
- **Precautions that get credit:**
  - set the rheostat to maximum first;
  - open the switch between readings;
  - transfer quickly;
  - stir;
  - immerse fully;
  - repeat and average;
  - zero the balance.

### Marking conventions (for the future marker; also in physics.md §3)
- **Mark types.**
  - M = method; A = answer **with unit**.
  - 1M/1A = a one-step part.
  - 1M+1M = independent terms.
  - 2M = a whole equation, with stated partial credit.
- **e.c.f.:** M marks always follow through. The A mark follows only where "e.c.f." is written.
- **Units.**
  - A repeated unit error is penalised once.
  - A unit fixed by the question ("in MeV") may be omitted, but a different unit is wrong.
  - Equivalent units are accepted (Wb = T m² = V s).
- **Rounding.**
  - The scheme gives the calculator value ≈ 3 s.f., with **accepted ranges, including g = 10 answers**.
  - Ranges are wider for values read off drawings (±1 grid square).
  - s.f. is enforced only when the question asks.
- **Invalid physics scores 0 even if the number is close:** suvat on a curved track; s = vt when the object is accelerating.
- **Verdict plus reason.**
  - A wrong verdict scores 0 for the whole part. A bare verdict scores 0.
  - If both verdicts are defensible, either scores with the matching reason.
- **Keyword marks.** Each causal link is 1A.
  - Some words are required, spelled correctly: "elastic", "total internal reflection", "refraction".
  - Vague restatements are rejected.
- **Use the given labels:** "PQRS", not "clockwise"; give a value when one is asked.
- **Diagrams.**
  - Free-body diagrams: 1A per force **with a label**. An extra force loses 1A.
  - Field lines: direction, spacing, and at least 3 lines.
  - Ray diagrams: M for the construction, A for the result.
- **"Show that":** method marks only. Just restating the given value earns 0.
- **"Any ONE/TWO":** credit up to that number. Answers must be relevant to the stated aim.

## 3. Paper 2 — electives

### Format (stable 2012–2023)
- **1 hour, any 2 of 4 sections.** Each section has 8 MC (n.1–n.8) and one 10-mark structured question with 4–6 parts of 1–3 marks.
- **MC formats** are the same as Paper 1A.
- **Structured questions** sit in a real context and run: state → show that → use the result → explain or comment on feasibility.
- **How many candidates choose each elective:** Energy 80–87%, Atomic 63–68%, Medical 26–32%, Astronomy 17–28% (falling).

### Archetypes by elective
- **VI Astronomy and Space Science**
  - Kepler III ratios; launch speed between circular and escape speed gives an ellipse (2021 Q1.1–1.2).
  - Escape velocity and orbital energy (2023 Q1.4–1.5).
  - **Parallax, with the p vs 2p trap** (2019 Q1.3, 2020 Q1.7).
  - Stefan's law to find radius (2023 SQ1a).
  - **Doppler with the Hβ 486.1 nm line;** radial-velocity curves (2023 SQ1c, 2021 SQ1b).
  - H–R diagram regions (2023 Q1.8).
  - Geocentric vs heliocentric models (2021 Q1.3).
- **VII Atomic World**
  - Energy-level diagrams: wavelength, colour, visible lines, all transitions from n = 4 (2021 SQ2b, 2023 SQ2).
  - Rutherford vs Thomson (2019 SQ2a).
  - **Photoelectric graphs:** KE vs 1/λ, V_s vs λ, I–V (2021 Q2.3–2.4, 2023 Q2.5).
  - de Broglie wavelength in eV or kV (2021 Q2.6).
  - Rayleigh criterion; TEM and STM (2023 Q2.7).
  - Nanomaterial statements every year.
- **VIII Energy and Use of Energy**
  - Illuminance with cosθ (2019 Q3.1, 2023 Q3.2).
  - Efficacy from energy labels (2023 Q3.1).
  - **U-values, composite walls, OTTV** (2021 Q3.4, 2023 Q3.3–3.4).
  - **COP with Q_H = Q_C + W** (2021 Q3.6, 2023 SQ3).
  - Electric-vehicle batteries and regenerative braking (2021 SQ3).
  - Solar panels and payback (2019 SQ3, 2022 SQ3).
  - Wind power P ∝ v³.
  - Binding energy and fission (2020 SQ3).
- **IX Medical Physics**
  - Dioptres, near and far points (2021 SQ4a, 2023 SQ4).
  - dB and phon (2023 Q4.2).
  - Fibre critical angle (2023 Q4.1).
  - **Ultrasound:** Z = ρc, reflection coefficient, A-scan depth = vt/2 (2021 Q4.5, 2019 SQ4b).
  - X-ray half-value thickness; CT (2021 Q4.6, 2020 SQ4).
  - **Effective half-life** (2023 Q4.8, 2019 Q4.7).
  - Radionuclide imaging vs X-ray (2022 SQ4b).

## 4. Common weaknesses (examiners' reports, 2012–2021) → feedback tags

Use these as error tags (`phy.*`) in a student's weakness profile.

| Tag | What the examiners say |
|---|---|
| `phy.explain_vague` | "weak in explaining principles of physics" (2015); "not concise" (2017); just restating definitions (2016); vague words ("radiations" instead of "ionizing radiations") (2018–19); the key reason not stated explicitly (2021) |
| `phy.units` | missing units; unit conversions; forgetting +273; angles not in radians (2021); kWh treated as power (2021); eV vs J (2016, 2018); missing ×10^14 from an axis label (2018) |
| `phy.graph_reading` | slope taken from one point and (0, 0) (2018); efficiency assumed constant instead of read off (2016); not reading KEmax off the graph (2020) |
| `phy.diagram_convention` | ray diagrams without arrows, solid vs dotted lines (2021); energy levels drawn horizontally; extra lines in transition diagrams (2015, 2021) |
| `phy.first_principles` | unable to work from first principles (2021); input vs output power (2016, 2021); not seeing "100 Ah 12 V" as 1.2 kWh (2019); no sense of scale ("a centimetre-thick eye lens", 2021) |
| `phy.misconception.*` | luminosity vs brightness (2012, 2016, 2018); radial vs orbital speed (2021); "same acceleration ⇒ weightlessness" (2019); excitation vs ionisation (2017, 2021); KEmax, φ and V_s confused (2016, 2018); α bouncing back in Thomson's model (2019); COP meaning (2015); regenerative braking "collects heat" (2014, 2021); binding energy "to bind" (2020); not knowing 1 D = 1 m⁻¹ (2021); ionizing vs non-ionizing radiation (2012, 2017, 2019); radionuclide contrast explained by attenuation (2016) |

## 5. Generator recipe (summary)

1. **Paper 1A.**
   - Use blocks of 3/10/9/8/3 in syllabus order. Put 6–9 `*` items at the ends of their blocks, and run each block easy → calculation → trap.
   - Format mix: about 9 statement items, about 9 calculations, 5–8 tables, 3–4 graph items, and 3–5 single-statement items.
   - For each item: pick an archetype, choose clean numbers, and build each distractor from a named slip, recording its misconception.
   - Balance the answer letters.
2. **Paper 1B.**
   - Put a context and figure first, and release new information between parts.
   - Escalate: recall → calculation → "hence" → explain → evaluate.
   - Include at least one experiment question and one passage question per paper, and finish with a short nuclear question.
   - Write the marking scheme in M/A notation with e.c.f. flags and accepted ranges.
3. **Paper 2.** 8 MC plus a 10-mark structured question per elective, in a real context, using the archetypes in §3.
4. **Verification.** Numeric answers go through the existing mathjs checker, with units and accepted ranges. Statement and explain items are flagged for teacher review, the same as maths proofs.
