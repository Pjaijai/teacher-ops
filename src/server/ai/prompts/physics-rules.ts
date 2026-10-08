import physicsTopics from "../../../../syllabus/physics.json";
import { z } from "zod";
import { GraphSchema, type Graph } from "@/lib/schemas/diagram";
import { PhysicsFigureSchema, type PhysicsFigure } from "@/lib/schemas/physics-figure";

/**
 * Shared prompt text for HKDSE Physics practice. Distilled from syllabus/physics.md and
 * syllabus/physics-question-design.md — past-paper citations stay internal.
 */

export type PhysicsTopic = {
  id: string;
  strand: string;
  nameEn: string;
  nameZh: string;
  extension: boolean;
  objectives: { id: string; textEn: string }[];
};
export const PHYSICS_TOPICS = physicsTopics as PhysicsTopic[];
export const PHYSICS_TOPIC_IDS = new Set(PHYSICS_TOPICS.map((t) => t.id));

/** Electives VI–IX are Paper 2 (8 MC + one 10-mark structured question per elective). */
export const isElective = (id: string) => /^PHY-(VI|VII|VIII|IX)-/.test(id);

export function topicList(ids?: string[]) {
  const list = ids?.length ? PHYSICS_TOPICS.filter((t) => ids.includes(t.id)) : PHYSICS_TOPICS;
  return list.map((t) => `${t.id}${t.extension ? " [EXT]" : ""} ${t.strand} — ${t.nameEn} (${t.nameZh})`).join("\n");
}

export function topicDetail(ids: string[]) {
  return PHYSICS_TOPICS.filter((t) => ids.includes(t.id))
    .map((t) => `${t.id} ${t.nameEn} (${t.nameZh})${t.extension ? " [EXT — extension component]" : ""}${isElective(t.id) ? " [ELECTIVE — Paper 2]" : ""}\n${t.objectives.map((o) => `  - ${o.id} ${o.textEn}`).join("\n")}`)
    .join("\n");
}

export const PHYSICS_DESIGN_NOTES = `HKDSE Physics — question design (distilled from Paper 1A/1B/2, marking schemes and examiners' reports).

PAPER 1A MC (33 items, syllabus order). Formats: (1)(2)(3) statement items with the fixed menus
"(1) only / (3) only / (1) and (2) only / (2) and (3) only" or "(1) and (2) only / (1) and (3) only / (2) and (3) only /
(1), (2) and (3)" — one true core fact, one classic misconception, one subtle statement that decides the key; the modal
word is the lever ("must be" knocks out sometimes-true facts, "can be", "always"); famous exceptions are favoured.
Calculations; two-column "X / Y" tables (one qualitative column such as direction × one value column, the four rows
covering every combination); choose-the-graph items; single correct / INCORRECT statement.
Difficulty: recall 70–90% correct; two-step calculation 45–65%; concept traps hardest (20–40%), e.g. a p–1/V line with an
intercept, direction of a hinge reaction, a kWh meter measures energy not power, contact force from an incline.
DISTRACTOR RECIPE — each wrong option comes from ONE named slip, the key has none; record the misconception:
inverted ratio / forgot the square; °C instead of K; wrong trig or angle from the surface instead of the normal (angles
printed in the figure are used as distractors); half-angle × order (grating); counting n crests as n wavelengths (n−1);
reading a phase-shifted graph; stopping at an intermediate quantity (J vs J kg⁻¹, C vs number of electrons); leaving out
exactly one term (forgot KE / forgot GPE / forgot the container); peak vs r.m.s. vs peak-to-peak; unit slips (min→s, mA h,
W vs kW); mixing lengths (rod length vs rail spacing); reversed direction / wrong-hand rule; linear instead of exponential
decay; red herrings (incline angle, friction, a.c. frequency). "Cannot be determined because X is unknown" may be a
distractor but is NEVER the key (the quantity cancels). Numeric options ascending; near-miss calculations ~5% apart, unit
slips orders of magnitude apart. Numbers come out exact (2000 W × 168 s = 1 × 4200 × 80), Pythagorean (60-80-100),
threshold traps (heat just short of melting all the ice → 0 °C). Symbolic keys are common (6mgh, mg tan θ).
MC archetypes: I heat-transfer recall, heating-curve plateau × power, mixtures, internal energy KE/PE, *p–T/p–V graphs,
*kinetic theory. II distance vs displacement, v–t area, equilibrium (strings, incline, resultant contact force), 3rd-law
pairs, accelerometer bob / apparent weight, connected bodies, energy graphs, momentum and recoil, metre rule with own
weight, *projectiles, *circular motion and gravitation. III λ or T from graphs, P/S waves, refraction ranking and critical
angle, stationary waves, two-source path difference, *double slit, *grating, lenses on a grid, EM spectrum and sound.
IV charge sharing, three charges, field-line ranking, *field superposition, opposing e.m.f.s, network power, R ∝ ρl/A,
null point between two wires, jumping ring / Lenz, domestic electricity, *transformer with r.m.s., *r = mv/qB,
*velocity selector. V "must be" half-life statements, back-calculating activity, counting α and β, radiation properties,
*mass–energy, fission and fusion facts. (* = extension)

PAPER 1B STRUCTURED QUESTIONS. About 70% have a real-life context; some are "Read the following passage…" questions.
Context and figure first; NEW information is released between parts. Escalation: (a) 1–2 mark recall or label →
(b) 2–3 mark core calculation → (c) "Hence…" calculation (e.c.f. chain) → (d) 2-mark "explain whether / is X greater
than, equal to or smaller than Y" → sometimes judge someone's suggestion. Mark mix ~50% calculation, ~30% explanation,
~15% drawing/graphs.
Command words → marks: State/Name 1A; Find/Calculate 2 (1M+1A) or 3 (1M+1M+1A) for two physics steps; Show that … M marks
only (gives later parts a number); Hence … 2 with e.c.f.; Explain / compare 2 = verdict + reason (3 = verdict + 2 causal
steps); label/draw on the figure 1A per element; sketch a graph 2A (shape + key feature); ray diagram on a grid 3–5
(construction M + result A); describe a procedure / precautions 1A per step; suggest an improvement 1A.
Traps to build into stems: forgetting the weight in an impulse problem; gauge vs absolute pressure; n crests = n−1
wavelengths; forgetting the container's heat capacity; suvat on a curved track (invalid); only the wire length inside the
field; an anomalous reading to discard; "linear" vs "directly proportional".
Long-question archetypes: H1 method of mixtures → error direction → judge an improvement; H2 heater power = rate of heat
loss; G1 gas-law chain in a device (pV = nRT → p after a change → force = Δp·A); G2 kinetic-theory explanation (speed/KE or
number density → collision frequency and violence → rate of change of momentum → pressure). M1 projectile in a sport or
rescue; M2 longer impact time → smaller force (2 marks); M3 Newton's 2nd law with a free-body diagram then "T >, = or < mg?
explain"; M4 v–t graph with reaction time and stopping distance; M5 P = Fv and W = ΔKE; M6 thrust from Δp/Δt + 3rd law;
M7 identify the centripetal force, rev/min ↔ ω; M8 gravitation / geostationary orbit. W1 reading wave diagrams (ripple
tank, longitudinal particle positions); W2 refraction and critical angle (optical fibre, rainbow droplet, f unchanged in
glass); W3 lens on a grid (type, F by construction, f ±1 grid square, magnification); W4 speed of sound by echo / two
microphones. E1 switch networks (lit or shorted, current directions, equivalent R, power, fuse suitability); E2 domestic
electricity (L/N/E, parallel wiring, fuse choice, kWh cost); E3 field between plates (E = V/d); E4 current balance;
E5 induction and Lenz (flux linkage, eddy currents, maglev). R1 count α and β in a series; R2 half-life and A = kN;
R3 radiation-safety judgement; R4 mass defect × 931 MeV, chain-reaction conditions.

EXPERIMENT QUESTIONS (kind "experiment"). Design type (5–6 marks, ~1A each): set-up or circuit (meter polarity),
measuring steps (vary, record, repeat), the formula/graph used, 1–2 precautions — "a change of apparatus is not a
precaution". Given set-up / data type (6–11 marks): mark a polarity or position; extra apparatus needed; DISCARD THE
ANOMALOUS READING then average; gradient → hence an unknown; linear vs directly proportional; explain a non-zero intercept;
suggest one improvement; direction of a systematic error; judge a peer's suggestion. Data go in a Markdown table in the
stem; a plotted graph uses graphJson (points + best-fit line). Creditable precautions: rheostat at maximum first; open the
switch between readings; transfer quickly; stir; immerse fully; repeat and average; zero the balance; avoid parallax.

PAPER 2 ELECTIVES (VI–IX): each section has 8 MC (same formats as 1A) + one 10-mark structured question (4–6 parts of
1–3 marks) in a real context: state → show that → use the result → explain or comment on feasibility.
VI Astronomy: Kepler III ratios; launch speed between circular and escape speed → ellipse; escape velocity and orbital
energy; parallax (p vs 2p trap); Stefan's law → radius; Doppler with Hβ 486.1 nm, radial-velocity curves; H–R regions;
geocentric vs heliocentric. VII Atomic World: energy-level diagrams (wavelength, colour, visible lines, all transitions
from n = 4); Rutherford vs Thomson; photoelectric graphs (KE vs 1/λ, V_s vs λ, I–V); de Broglie λ in eV or kV; Rayleigh
criterion, TEM/STM; nanomaterial statements. VIII Energy: illuminance with cos θ; efficacy from energy labels; U-values,
composite walls, OTTV; COP with Q_H = Q_C + W; EV batteries and regenerative braking; solar panels and payback; wind
P ∝ v³; binding energy and fission. IX Medical: dioptres, near and far points; dB and phon; fibre critical angle;
ultrasound Z = ρc, reflection coefficient, A-scan depth = vt/2; X-ray half-value thickness, CT; effective half-life;
radionuclide imaging vs X-ray.

COMMON WEAKNESSES (error tags "phy.*", use in distractor tags and tips): phy.explain_vague (restating definitions, key
reason not stated), phy.units (missing units, conversions, forgetting +273, kWh as power, eV vs J), phy.graph_reading
(slope from one point and the origin), phy.diagram_convention (ray diagrams without arrows, solid vs dotted lines),
phy.first_principles (input vs output power, "100 Ah 12 V" = 1.2 kWh), phy.misconception.* (luminosity vs brightness,
excitation vs ionisation, KEmax/φ/V_s confused, ionizing vs non-ionizing).`;

export function physicsLanguageRules(language: "zh" | "en") {
  return language === "zh"
    ? `Language: Traditional Chinese as printed in HKDSE Physics papers (繁體中文, Hong Kong usage). Use DSE terminology:
求 / 計算 (find / calculate), 由此 (hence), 證明 (show that), 解釋你的答案 (explain your answer), 試描述 (describe),
估算 (estimate), 大於、等於或小於 (greater than, equal to or smaller than), 加速度, 速度, 位移, 合力, 自由體圖, 重量,
法向反作用力, 摩擦力, 張力, 慣性, 動量, 動量的改變, 彈性碰撞, 非彈性碰撞, 力矩, 力偶, 重心, 拋體, 向心力, 角速度,
引力場強度, 功, 動能, 勢能, 功率, 效率, 比熱容, 比潛熱, 熔解, 汽化, 內能, 溫度, 熱容量, 氣體定律, 分子運動論, 絕對零度,
波長, 頻率, 週期, 振幅, 波速, 橫波, 縱波, 波峰, 波谷, 密部, 疏部, 相位, 同相, 反相, 反射, 折射, 繞射, 干涉, 程差, 駐波,
波節, 波腹, 折射率, 臨界角, 全內反射, 會聚透鏡 (凸透鏡), 發散透鏡 (凹透鏡), 焦點, 焦距, 主軸, 實像, 虛像, 放大率,
光柵, 電荷, 電場強度, 電勢差, 電動勢, 內電阻, 電流, 電阻, 電阻率, 串聯, 並聯, 分壓器, 安培計, 伏特計, 變阻器,
保險絲, 斷路器, 火線, 中線, 地線, 千瓦小時, 磁場, 磁通量, 電磁感應, 楞次定律, 渦電流, 變壓器, 方均根值, 半衰期,
放射強度, 衰變常數, 電離能力, 穿透能力, 核裂變, 核聚變, 連鎖反應, 質量虧損. Units are written with the same symbols as
in English papers (m s⁻², J kg⁻¹ °C⁻¹, Ω). Answer statements such as 答案須準確至三位有效數字 where relevant.`
    : `Language: English as printed in HKDSE Physics papers ("Find …", "Calculate …", "Hence …", "Show that …",
"Explain your answer.", "Is X greater than, equal to or smaller than Y? Explain.", "Describe how …",
"State ONE precaution", "Estimate …", "In the figure, …"). British spelling (metre, ionizing as in HKEAA papers).`;
}

export const PHYSICS_LATEX_RULES = `Formatting:
- All text fields are Markdown with LaTeX in $…$ (inline) or $$…$$ (display), rendered with KaTeX. Write every
  quantity and equation in LaTeX: $v = u + at$, $F = \\frac{GMm}{r^2}$, $2.5\\ \\text{m s}^{-2}$, $4.2 \\times 10^{3}\\ \\text{J}$,
  $12\\ \\Omega$, $25\\ ^\\circ\\text{C}$, $\\theta = 30^\\circ$. Units in HKDSE style with negative indices
  ("m s$^{-1}$", "J kg$^{-1}$ $^\\circ$C$^{-1}$", "N m"). Escape backslashes properly in JSON.
- Data tables go in the stem as Markdown tables with units in the headers ("$I$ / A").
- Figure labels inside figureJson are PLAIN TEXT drawn in SVG: "R₁", "4 Ω", "6 V", "θ", "F′", "W" — never $ or backslashes.`;

export const PHYSICS_UNIT_RULES = `Answer-check rules (a program verifies every number WITH UNITS using mathjs, so be exact):
- variables: name EVERY given quantity and constant used, with a simple identifier (m, u, v, t, h, R1, V, theta, g, c,
  lambda …), its numeric value as given, and its unit as a mathjs unit string: "kg", "m", "cm", "s", "min", "m/s",
  "m/s^2", "N", "J", "kJ", "W", "kW", "kW h", "V", "A", "mA", "ohm", "kohm", "C", "Hz", "Pa", "kPa", "K", "J/(kg K)",
  "J/kg", "T", "Wb", "eV", "MeV", "u", "Bq", "nm", "mol", "m^3". Use null for pure numbers and for ANGLES IN DEGREES
  (used with sind/cosd/tand). Constants are variables too: g = 9.81 "m/s^2" (or 10 if the question says so),
  c = 3e8 "m/s", e = 1.6e-19 "C", h = 6.63e-34 "J s", G = 6.67e-11 "N m^2/kg^2", R = 8.31 "J/(mol K)".
- TEMPERATURES: a temperature CHANGE in °C uses unit "K" (1 °C change = 1 K). For gas laws, give absolute
  temperatures already in kelvin (T1 = 300, "K") — never add 273 to a unit quantity inside an expression.
- answers[]: one entry per numeric answer (per part). expression = mathjs expression using ONLY the variable names,
  numbers, + - * / ^, parentheses, sqrt(), exp(), log(x) (natural), log10(), pi, abs(), and the DEGREE trig functions
  sind(), cosd(), tand(), asind(), acosd(), atand(). mathjs converts units, so mixing cm and m is fine.
  unit = the mathjs unit string of the answer (e.g. "m/s^2", "kJ", "ohm"), or null for a pure number or an angle in degrees.
  value = the exact unrounded value IN THAT UNIT. display = the answer as in the marking scheme, with its unit, e.g.
  "$2.45\\ \\text{m s}^{-2}$", "$1.2 \\times 10^{3}\\ \\text{J}$", "$36.9^\\circ$"; the number must equal value after rounding
  (normally 3 significant figures).
- Parts with no single numeric answer (explain, state, describe, draw, show-that, verdicts) get NO answers entry.
- answers[].part must match a markingScheme part label.`;

export const PHYSICS_MARKING_RULES = `Marking scheme (HKEAA Physics conventions):
- markingScheme: one entry per part ("" for a single-part question, else "a", "b(i)" …); marks = number of items; each
  item is worth exactly ONE mark: "1M" items have type "M", "1A" items type "A".
- M = method (correct equation/substitution). A = answer: a correct NUMBER WITH ITS UNIT; state the unit in the item text
  ("$a = 2.45\\ \\text{m s}^{-2}$"). Give accepted ranges for values read from graphs or drawings and note "accept $g = 10$"
  alternatives, e.g. "$2.94\\ \\text{J}$ (accept 2.9 – 3.0 J)".
- ecf = true on an A mark only in a "Hence" part (follow-through from an earlier wrong answer is accepted); M marks always
  follow through.
- Calculation of one step: 1M + 1A; two physics steps: 1M + 1M + 1A. "Show that": M marks only (no A for restating).
- Explain / compare parts: write each creditable point as its own 1A item, naming the REQUIRED keyword in the item text
  (e.g. "Total internal reflection occurs (MUST mention 'total internal reflection')"). Verdict parts: the verdict item
  says "correct verdict with reason; a wrong or unsupported verdict scores 0 for the part".
- Drawing parts: 1A per correct element (free-body diagram: 1A per correctly labelled force; an extra force loses 1A;
  ray diagram: M for construction rays with arrows, A for the image position/nature).
- Experiment parts: 1A per procedure step / precaution / correct use of data (discarding the anomalous reading).
- MC questions: markingScheme = [] (one mark, keyed by correctOption).`;

export const PHYSICS_FIGURE_RULES = `Figures:
- figureJson is for circuits, ray diagrams (lenses and mirrors), free-body diagrams and wave graphs, in the PHYSICS FIGURE
  format below (choose "kind"). Use "" when no figure is needed. graphJson is for data/function graphs (experiment
  results, v–t graphs, decay curves): functions are mathjs expressions in x; data points go in points.
- The figure must agree with the numbers in the stem: every given resistance, e.m.f., distance, angle or force appears
  in the figure data and labels. The program solves the circuit, applies the lens/mirror formula, checks force balance
  and v = fλ — inconsistent figures are rejected.
- Circuits: nodes on an integer grid (about 0–8 × 0–6), every component horizontal or vertical (add corner nodes),
  parallel branches on separate lines; cell/battery from = negative terminal, to = positive terminal; set value for
  resistors/lamps (Ω) and cells (V) when known, and reading for every ammeter/voltmeter whose reading is known or asked.
  Answers that are NOT shown to the student (e.g. the reading to be calculated) must NOT appear in labels.
- Ray diagrams: element at x = 0 on the principal axis y = 0, object on the LEFT (x < 0), coordinates in the question's
  units (e.g. cm). Rays start at the object tip, bend at x = 0, and pass through the image tip (dashed backward
  extensions for virtual images). If the student must locate the image or draw the rays, set image null and rays [].
- Free-body diagrams: forces from the body's centre; weight at 270°, normal force perpendicular to the surface
  (incline rising to the right at θ → normal at 90° + θ), friction along the surface. Don't reveal the forces the
  student must draw.
- Wave graphs: y = A sin(360°·s/spacing + phase); set speed/frequency when the question states them.`;

/** JSON formats given to the model as text (figures travel as JSON strings). */
export const PHYSICS_FIGURE_FORMATS = `PHYSICS FIGURE format (JSON Schema; fields with defaults may be omitted):
${JSON.stringify(stripMeta(z.toJSONSchema(PhysicsFigureSchema, { io: "input" })))}

GRAPH format (JSON Schema):
${JSON.stringify(stripMeta(z.toJSONSchema(GraphSchema)))}`;

function stripMeta(s: unknown) {
  const { $schema: _x, ...rest } = s as Record<string, unknown>;
  return rest;
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
  if (!parsed.success) {
    const msg = parsed.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { value: null, problems: [`${what} JSON does not match the ${what.toUpperCase()} format (${msg})`] };
  }
  return { value: parsed.data, problems: [] };
}

export const parsePhysicsFigureJson = (text: string) => parseJsonField<PhysicsFigure>(text, PhysicsFigureSchema as z.ZodType<PhysicsFigure>, "physics figure");
export const parsePhysicsGraphJson = (text: string) => parseJsonField<Graph>(text, GraphSchema, "graph");
