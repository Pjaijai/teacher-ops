import { z } from "zod";

/**
 * Structured figure. The AI writes this, our components draw it and our checker verifies it,
 * so the picture and the numbers come from the same data. Coordinates use the question's units.
 */
export const DiagramSchema = z.object({
  kind: z.enum(["geometry", "coordinate"]),
  points: z.array(
    z.object({
      id: z.string().describe("Point name as printed, e.g. A, B, P"),
      x: z.number(),
      y: z.number(),
      showLabel: z.boolean(),
      showDot: z.boolean().describe("true for coordinate-plane points; usually false for geometry vertices"),
    }),
  ),
  segments: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.string().nullable().describe('Length label such as "5 cm" or "x", or null'),
      dashed: z.boolean(),
    }),
  ),
  circles: z.array(
    z.object({
      center: z.string().describe("Id of the centre point"),
      radius: z.number(),
      label: z.string().nullable(),
    }),
  ),
  rightAngles: z.array(z.object({ vertex: z.string(), a: z.string(), b: z.string() })),
  angles: z.array(
    z.object({ vertex: z.string(), a: z.string(), b: z.string(), label: z.string().nullable().describe('e.g. "35°" or "θ"') }),
  ),
  axes: z
    .object({ xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number(), tickStep: z.number() })
    .nullable()
    .describe("Only for kind=coordinate"),
  notToScale: z.boolean(),
});
export type Diagram = z.infer<typeof DiagramSchema>;

/**
 * Function graphs, drawn with Mafs. Expressions are mathjs in x (e.g. "x^2 - 2*x - 3").
 * `asymptotes` and `regions` were added for M1/M2 (v2); they're optional so older stored graphs still parse.
 */
export const GraphSchema = z.object({
  xMin: z.number(),
  xMax: z.number(),
  yMin: z.number(),
  yMax: z.number(),
  functions: z.array(
    z.object({
      expr: z.string(),
      label: z.string().nullable(),
      dashed: z.boolean(),
      domain: z
        .tuple([z.number(), z.number()])
        .nullable()
        .optional()
        .describe("Draw only for x in [a, b] (e.g. [0, 4] for a curve defined on 0 ≤ x ≤ 4); null/omitted = whole window"),
    }),
  ),
  points: z.array(z.object({ x: z.number(), y: z.number(), label: z.string().nullable() })),
  asymptotes: z
    .array(
      z.object({
        axis: z.enum(["vertical", "horizontal"]).describe("vertical: the line x = value; horizontal: the line y = value"),
        value: z.number(),
        label: z.string().nullable().describe('Plain text, e.g. "x = 2"'),
      }),
    )
    .optional()
    .describe("Dashed vertical/horizontal asymptotes (oblique ones: add a dashed function instead)"),
  regions: z
    .array(
      z.object({
        upper: z.string().describe('mathjs expression in x for the upper boundary, e.g. "x^2 + 1"'),
        lower: z.string().describe('mathjs expression in x for the lower boundary; "0" for the x-axis'),
        from: z.number().describe("left end a of the shaded region"),
        to: z.number().describe("right end b of the shaded region"),
        label: z.string().nullable().describe('Plain text drawn inside the region, e.g. "R"'),
      }),
    )
    .optional()
    .describe("Shaded regions between two curves (or a curve and the x-axis) over [from, to], for area/volume questions"),
});
export type Graph = z.infer<typeof GraphSchema>;

export const DIAGRAM_RULES = `Figure rules:
- "figure" is for geometry and coordinate figures: points, segments, circles, right-angle marks and angle marks. 3D solids are NOT supported.
- "graph" is for graphs of functions y = f(x) (expressions in mathjs syntax using x, e.g. "x^2 - 2*x - 3", "2^x", "sin(x)", "e^x", "log(x)" for ln x).
  Several curves may be drawn (functions[]), with labelled points, dashed asymptotes (asymptotes[]) and shaded regions
  between two curves or a curve and the x-axis over [a, b] (regions[]) for area and volume questions.
- Coordinates MUST be in the same units as the lengths in the question, so the figure is to scale.
- Every point referenced by a segment, circle, rightAngle or angle must exist in points.
- Mark every right angle that the question states or implies. Put given lengths and unknowns (x, y, h …) as segment labels; put given and unknown angles in angles.
- kind="geometry" → axes null. kind="coordinate" → axes that contain all points, showDot=true on plotted points.
- notToScale=false unless the question explicitly says the figure is not drawn to scale.
- Use null for figure/graph when the question needs none.`;
