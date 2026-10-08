import { z } from "zod";

/**
 * Physics figures (v3): circuit, ray diagram, free-body diagram and wave graph. The AI writes this JSON,
 * our SVG components draw it (src/components/diagrams/) and physics-check.ts verifies it against the
 * numbers in the question, so the picture and the numbers come from the same data.
 * Fields with defaults may be left out by the model; labels are plain text drawn in SVG (no LaTeX).
 */

const label = z.string().nullable().default(null);

// ---------------------------------------------------------------------------
// Circuit: nodes on a grid, components drawn on the straight line between two nodes.

export const CIRCUIT_COMPONENTS = [
  "wire",
  "cell",
  "battery",
  "resistor",
  "variable_resistor",
  "lamp",
  "switch",
  "ammeter",
  "voltmeter",
  "fuse",
  "diode",
  "capacitor",
] as const;

export const CircuitFigureSchema = z.object({
  kind: z.literal("circuit"),
  nodes: z
    .array(
      z.object({
        id: z.string().describe("Node id, e.g. n1 or a printed label such as X, P"),
        x: z.number().describe("Grid column (integer); 1 unit = one grid square"),
        y: z.number().describe("Grid row (integer); y increases UPWARDS"),
        label: label.describe('Printed label next to the node (e.g. "X", "P"), or null'),
      }),
    )
    .describe("Corners, junctions and terminals. Use extra corner nodes so every component is horizontal or vertical"),
  components: z.array(
    z.object({
      type: z.enum(CIRCUIT_COMPONENTS),
      from: z.string().describe("Node id. cell/battery: the NEGATIVE terminal. diode: the anode (current flows from → to)"),
      to: z.string().describe("Node id. cell/battery: the POSITIVE terminal (long plate)"),
      label: label.describe('Plain-text label such as "R₁", "4 Ω", "6 V", "S", "L₁", or null'),
      value: z
        .number()
        .nullable()
        .default(null)
        .describe("resistor/lamp/variable_resistor: resistance in Ω; cell/battery: e.m.f. in V; capacitor: F. null if unknown/not needed"),
      internalResistance: z.number().nullable().default(null).describe("cell/battery only: internal resistance in Ω (null = negligible)"),
      closed: z.boolean().default(true).describe("switch only: true = closed"),
      reading: z
        .number()
        .nullable()
        .default(null)
        .describe("ammeter (A) / voltmeter (V): the true reading with the switches as drawn, for the code check only (NOT drawn)"),
    }),
  ),
});
export type CircuitFigure = z.infer<typeof CircuitFigureSchema>;
export type CircuitComponent = CircuitFigure["components"][number];

// ---------------------------------------------------------------------------
// Ray diagram: optical element at x = 0 on the principal axis y = 0; object on the left.

const RayPoint = z.object({ x: z.number(), y: z.number() });

export const RayFigureSchema = z.object({
  kind: z.literal("ray"),
  element: z.object({
    type: z.enum(["convex_lens", "concave_lens", "plane_mirror", "concave_mirror", "convex_mirror"]),
    focalLength: z.number().nullable().describe("Focal length as a POSITIVE magnitude in the figure's units, or null if unknown (to be found)"),
    halfHeight: z.number().nullable().default(null).describe("Half the drawn height of the lens/mirror; null = automatic"),
  }),
  object: z
    .object({
      x: z.number().describe("Object position: NEGATIVE (left of the element), so u = -x"),
      height: z.number().describe("Object height (positive = upright arrow above the axis)"),
      label: z.string().default("O"),
    })
    .nullable(),
  image: z
    .object({
      x: z.number().describe("Image position (lens: real images have x > 0; mirror: real images have x < 0)"),
      height: z.number().describe("Image height (negative = inverted)"),
      virtual: z.boolean(),
      label: z.string().default("I"),
    })
    .nullable()
    .describe("null when the student must locate the image"),
  rays: z
    .array(
      z.object({
        points: z.array(RayPoint).min(2).describe("Polyline; a ray through a lens/mirror bends at x = 0"),
        dashed: z.boolean().default(false).describe("true for virtual extensions (construction lines)"),
        arrow: z.boolean().default(true).describe("Direction arrow on the ray"),
      }),
    )
    .default([]),
  showFocalPoints: z.boolean().default(true),
  window: z
    .object({ xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number() })
    .describe("Visible region in the figure's units; must contain the object, image, focal points and rays"),
  gridSpacing: z.number().nullable().default(null).describe("Draw a square grid with this spacing (exam 'grid' questions); null = no grid"),
  scaleNote: label.describe('e.g. "1 square represents 5 cm"'),
});
export type RayFigure = z.infer<typeof RayFigureSchema>;

// ---------------------------------------------------------------------------
// Free-body diagram: one body with force arrows from its centre.

export const FreeBodyFigureSchema = z.object({
  kind: z.literal("free_body"),
  body: z.object({ shape: z.enum(["box", "circle", "point"]).default("box"), label: label }),
  surface: z
    .enum(["none", "ground", "incline", "wall"])
    .default("none")
    .describe("What the body rests on (drawn under/next to it). incline uses inclineAngle"),
  inclineAngle: z.number().nullable().default(null).describe("Incline angle to the horizontal in degrees; the slope rises to the RIGHT"),
  forces: z.array(
    z.object({
      label: z.string().describe('Plain-text label, e.g. "W", "R", "T = 20 N", "f"'),
      type: z.enum(["weight", "normal", "friction", "tension", "applied", "drag", "other"]).default("other"),
      angle: z.number().describe("Direction in degrees, anticlockwise from the +x axis (right = 0, up = 90, down = 270)"),
      magnitude: z.number().nullable().default(null).describe("Magnitude in N if known (sets the arrow length), else null"),
    }),
  ),
  equilibrium: z.boolean().default(false).describe("true when the question states the body is at rest / moves at constant velocity"),
  showAngle: z.boolean().default(true).describe("Mark the incline angle"),
});
export type FreeBodyFigure = z.infer<typeof FreeBodyFigureSchema>;

// ---------------------------------------------------------------------------
// Wave graph: displacement–distance (axis "x") or displacement–time (axis "t") sinusoids.

const WaveCurve = z.object({
  amplitude: z.number(),
  spacing: z.number().describe("Wavelength (axis x) or period (axis t), in the axis units"),
  phase: z.number().default(0).describe("Phase in degrees: y = A sin(360°·s/spacing + phase)"),
  label: label,
});

export const WaveFigureSchema = z.object({
  kind: z.literal("wave"),
  axis: z.enum(["x", "t"]).describe('"x" = displacement–distance graph (snapshot); "t" = displacement–time graph'),
  curve: WaveCurve,
  second: WaveCurve.nullable().default(null).describe("A second wave (drawn dashed), e.g. for superposition"),
  mode: z
    .enum(["single", "superposition", "stationary"])
    .default("single")
    .describe("superposition: also draw the sum (bold); stationary: draw curve and its mirror image (envelope) with nodes"),
  from: z.number().default(0).describe("Start of the horizontal axis"),
  to: z.number().describe("End of the horizontal axis"),
  xLabel: z.string().describe('Horizontal axis label with unit, e.g. "x / m" or "t / s"'),
  yLabel: z.string().describe('Vertical axis label with unit, e.g. "y / cm"'),
  tickStep: z.number().nullable().default(null).describe("Horizontal tick spacing (null = automatic)"),
  direction: z.enum(["left", "right"]).nullable().default(null).describe("Direction of travel (axis x only), drawn as an arrow"),
  points: z
    .array(z.object({ at: z.number().describe("Position (x or t) of a marked particle/instant on the main curve"), label: z.string() }))
    .default([]),
  speed: z.number().nullable().default(null).describe("Wave speed stated in the question, in (horizontal-axis length unit) per second, for the v = fλ check; else null"),
  frequency: z.number().nullable().default(null).describe("Frequency stated in the question (for the check), else null"),
});
export type WaveFigure = z.infer<typeof WaveFigureSchema>;

export const PhysicsFigureSchema = z.discriminatedUnion("kind", [CircuitFigureSchema, RayFigureSchema, FreeBodyFigureSchema, WaveFigureSchema]);
export type PhysicsFigure = z.infer<typeof PhysicsFigureSchema>;
