# HKDSE Physics — exam format and syllabus

Status: **draft v0.1 (2026-10-07), awaiting review by a Physics teacher.**

How this file is sourced:
- **Official** parts are from public HKEAA/EDB documents: the assessment frameworks for 2024–2029, the Curriculum and Assessment Guide (2015 update), and the general marking instructions in the 2019–20 marking schemes.
- **Inferred** parts are our own conventions. They're marked *inferred*.
- Question design is in [physics-question-design.md](physics-question-design.md).

Physics is **not yet in the build order** (see SPEC.md). For now this file is reference material.

---

## 1. Exam structure (official; unchanged 2012–2029 apart from 2022–23)

| Component | Weighting | Time | Contents |
|---|---|---|---|
| Paper 1 Section A | 21% | ~50 min suggested | **33 MC** (36 in 2012 and the sample paper). Equal marks, no penalty for wrong answers. |
| Paper 1 Section B | 39% | (Paper 1 total 2½ h) | Short, structured and essay questions, all compulsory. **84 marks**, usually 9–10 questions of 5–14 marks. |
| Paper 2 (electives) | 20% | 1 h | 4 sections; candidates **answer all of any 2**. Each section has **8 MC + one 10-mark structured question** (10% of the subject per elective). |
| SBA | 20% | — | From 2024: S5 one experiment (6%); S6 one experiment (6%) + an investigative study or detailed experiment report (8%). |

- **Data and formula sheet:** on the last pages of Paper 1A and Paper 2. The compulsory relationships are numbered A1–A5, B1–B7, C1–C3, D1–D13, E1–E4, with a separate block for each elective. Constants include g = 9.81 m s⁻² and 1 u = 931 MeV.
- **Exceptions:**
  - 2022: SBA cancelled (from a search summary only; the press release wasn't opened).
  - 2023: SBA cancelled (verified), and the papers were rescaled to Paper 1 75% (26.25 / 48.75) and Paper 2 25%.
- **No change for Physics** from the 2021 senior-secondary optimisation, which only changed the four core subjects. Physics also isn't in HKEAA's list of 2027 changes.
- **Extension component:** questions on extension content are marked `*` in the papers, up to 2023. *Unverified* whether this continues from 2024, because we don't have the 2024 papers.

## 2. Syllabus tree

**IDs:** `PHY-<topic numeral>-<subtopic>` uses the official numerals I–X, with subtopic letters turned into numbers (a = 1). Third-level items add `.n`, e.g. `PHY-II-2.3`. These IDs tag questions, mistakes and mastery, the same way Learning Units do for maths.

**[EXT]** marks the extension component: content underlined in the Curriculum and Assessment Guide, which is harder and is starred (`*`) in papers. There are two inconsistencies in the guide:
- Momentum is listed as extension in its Fig. 3.7 but isn't underlined.
- F = BQv sinθ is underlined but isn't in Fig. 3.7.

### Compulsory part

**PHY-I Heat and Gases 熱和氣體**
- **I-1 Temperature, heat and internal energy 溫度、熱及內能**
  - 1.1 Temperature and thermometers, including calibration from a linear graph.
  - 1.2 Heat vs internal energy: internal energy = random KE + PE of molecules.
  - 1.3 Heat capacity and specific heat capacity: c = Q/(mΔT); measuring c.
- **I-2 Transfer processes 熱轉移過程**
  - Conduction, convection and radiation. Molecular account of conduction; infrared; factors in emission and absorption.
- **I-3 Change of state 物態的改變**
  - 3.1 Melting and boiling points.
  - 3.2 Latent heat: ℓ = Q/m.
  - 3.3 Evaporation: cooling effect and its factors.
- **I-4 Gases 氣體 [EXT]**
  - 4.1 General gas law: pV/T constant, pV = nRT; absolute zero by extrapolation.
  - 4.2 Kinetic theory: pV = ⅓Nm⟨c²⟩; KE_avg = 3RT/2N_A. No derivation required.

**PHY-II Force and Motion 力和運動**
- **II-1 Position and movement 位置和移動**
  - Displacement; scalars and vectors; s–t, v–t and a–t graphs; the suvat equations; vertical motion under gravity.
  - Relative velocity is not required.
- **II-2 Force and motion 力和運動**
  - Newton's three laws.
  - Adding and resolving forces.
  - Free-body diagrams; connected bodies.
  - Mass vs weight.
  - Moments: torque, couples, equilibrium, centre of gravity. Non-perpendicular forces are expected.
- **II-3 Projectile motion 拋體運動 [EXT]**
  - Horizontal and vertical motion are independent. No range or trajectory formulae.
- **II-4 Work, energy and power 作功、能量和功率**
  - W = Fs cosθ; mgh; ½mv²; conservation with losses; P = Fv.
- **II-5 Momentum 動量**
  - F = Δp/Δt; F–t graphs; conservation of momentum; elastic vs inelastic collisions.
- **II-6 Uniform circular motion 勻速圓周運動 [EXT]**
  - ω, v = ωr, a = v²/r.
- **II-7 Gravitation 引力 [EXT]**
  - F = GMm/r²; g above a planet; orbital velocity.
  - Kepler's laws and escape velocity are not required in this topic; they belong to elective VI.

**PHY-III Wave Motion 波動**
- **III-1 Nature and properties of waves 波的本質和特性**
  - Transverse and longitudinal waves; displacement–time and displacement–distance graphs; v = fλ.
  - Reflection, refraction, diffraction, interference (path difference); stationary waves.
- **III-2 Light 光**
  - EM spectrum.
  - Reflection; refraction (n = sin i / sin r); total internal reflection and critical angle.
  - Ray diagrams for lenses. **[EXT]** 1/u + 1/v = 1/f ("real is positive").
  - Young's double slit. **[EXT]** Δy = λD/a and the grating d sinθ = nλ.
- **III-3 Sound 聲音**
  - Wave nature; audible range and ultrasound; pitch, loudness and quality; dB (qualitative); noise.

**PHY-IV Electricity and Magnetism 電和磁**
- **IV-1 Electrostatics 靜電學**
  - Charging; Coulomb's law with 2-D vector addition; field lines; E = F/q.
  - **[EXT]** E = Q/4πε₀r² and E = V/d.
- **IV-2 Circuits and domestic electricity 電路和家居用電**
  - I = Q/t; p.d. vs e.m.f.; resistance and I–V characteristics; ρ = RA/l.
  - Series and parallel; internal resistance; potential divider; meter loading.
  - P = VI; kWh and cost; live, neutral and earth; fuses; ring circuit.
- **IV-3 Electromagnetism 電磁學**
  - Field patterns: B = μ₀I/2πr and μ₀NI/l.
  - F = BIl sinθ; d.c. motor; induction, Lenz's law, generators, eddy currents.
  - **[EXT]** F = BQv sinθ; flux and Faraday's law; a.c. r.m.s.; transformers; high-voltage transmission.

**PHY-V Radioactivity and Nuclear Energy 放射現象和核能**
- **V-1 Radiation and radioactivity 輻射與放射現象**
  - X-rays; properties of α, β and γ; random decay and half-life; GM counter; sievert and radiation safety.
  - **[EXT]** N = N₀e^(−kt).
- **V-2 Atomic model 原子模型**
  - Nuclide notation; isotopes; decay equations.
- **V-3 Nuclear energy 核能**
  - Fission and fusion; chain reaction.
  - **[EXT]** ΔE = Δmc²; 1 u = 931 MeV.

### Electives (any 2 of 4; one Paper 2 section each)

**PHY-VI Astronomy and Space Science 天文學和航天科學** (Section A)
- **VI-1** Scales of the universe 不同空間標度下的宇宙面貌: light year, AU.
- **VI-2** Astronomy through history 天文學的發展史: geocentric vs heliocentric models; Galileo; Kepler's laws.
- **VI-3** Orbital motion under gravity 重力下的軌道運動: T² = 4π²a³/GM; apparent weightlessness; U = −GMm/r; escape velocity.
- **VI-4** Stars and the universe 恆星和宇宙: parallax (pc); magnitude; blackbody curves; OBAFGKM; L = 4πR²σT⁴; H–R diagram; Doppler Δλ/λ₀ = v/c; radial-velocity and rotation curves; red shift.

**PHY-VII Atomic World 原子世界** (Section B)
- **VII-1** Rutherford's model 盧瑟福原子模型 and its limitations.
- **VII-2** Photoelectric effect 光電效應: hf = φ + KEmax; stopping potential.
- **VII-3** Bohr's hydrogen model 玻爾的氫原子模型: E_n = −13.6/n² eV; line spectra; excitation vs ionisation.
- **VII-4** Particles or waves 粒子或波: λ = h/p.
- **VII-5** Nano scale 窺探納米世界: properties of nanomaterials; TEM and STM; Rayleigh θ ≈ 1.22λ/d.

**PHY-VIII Energy and Use of Energy 能量和能源的使用** (Section C)
- **VIII-1** Electricity at home 家居用電: lighting (lumen, lux, efficacy, cosine law); cooking (induction, microwave); air conditioners (COP); energy labels (EELS).
- **VIII-2** Buildings and transport 在建築和運輸業中的能源效率: conduction rate, U-value, OTTV; electric and hybrid vehicles.
- **VIII-3** Renewable and non-renewable sources 可再生和不可再生能源: solar constant; P = ½ρAv³η; hydroelectric; binding-energy curve; fission reactors; environmental impact.

**PHY-IX Medical Physics 醫學物理學** (Section D)
- **IX-1** Eye and ear 眼和耳的感官: dioptres; near and far points; vision defects; dB and phon.
- **IX-2** Non-ionizing imaging 非電離輻射醫學影像學: Z = ρc and reflection coefficient; A- and B-scans; endoscopes.
- **IX-3** Ionizing imaging 電離輻射醫學影像學: I = I₀e^(−μx); half-value thickness; CT; Tc-99m; effective half-life.

**PHY-X Investigative Study 物理科探究研習**: assessed through SBA only.

Detailed learning outcomes and "not required" notes for each item are in the raw notes (`corpus/notes/phy-format.md`, git-ignored). They'll go into `syllabus/physics.json` when Physics enters the build.

## 3. Marking rules (official, from HKEAA's general marking instruction, 2019–20)

1. **Any correct method** earns full marks, unless the question specifies a method.
2. **'A' (answer) marks need a correct number *and* unit.**
   - If the same unit is wrong more than once in a question, later A marks are given without the unit.
   - A wrong prefix (cm or m when km is needed) counts as a wrong unit.
3. **e.c.f. (error carried forward):** 'M' (method) marks are given for correct steps built on an earlier wrong answer. The matching A marks are **not** given, unless the scheme says "e.c.f.".
4. **Implied steps** earn marks if the concept was clearly used.
5. **Extra answers** are all marked, and the lowest-scoring excess answers are discarded.
6. **Key terms can be required**, e.g. "MUST have the word: 'Elastic'". Some wordings are listed as not accepted.
7. **Significant figures:** there's no general rule; a question asks when it matters. *Inferred default:* accept 2–4 s.f.
8. **MC:** equal marks, no deduction for wrong answers, and two answers marked gives 0.
9. **Examiner reports** penalise missing units, unit conversions, a missing "+273", ray diagrams without arrows, and explanations that don't state the key reason.

