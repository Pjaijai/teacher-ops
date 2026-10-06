import { z } from "zod";

/**
 * Structured description of a maths figure. The AI writes this; our renderer draws it and
 * our checker verifies it, so the picture and the numbers always come from the same data.
 * Coordinates are in the same units as the lengths in the question (drawn to scale).
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
  rightAngles: z.array(
    z.object({ vertex: z.string(), a: z.string(), b: z.string() }).describe("Right-angle mark for angle a-vertex-b"),
  ),
  angles: z.array(
    z.object({
      vertex: z.string(),
      a: z.string(),
      b: z.string(),
      label: z.string().nullable().describe('e.g. "35°" or "θ"'),
    }),
  ),
  axes: z
    .object({ xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number(), tickStep: z.number() })
    .nullable()
    .describe("Only for kind=coordinate"),
  notToScale: z.boolean(),
});

export type Diagram = z.infer<typeof DiagramSchema>;

export const DIAGRAM_RULES = `Diagram format rules:
- Supported figures: straight-line 2D figures (triangles, quadrilaterals, figures made of several triangles) and points/segments on a coordinate plane. NOT supported: circles/arcs, 3D solids, curves/graphs of functions.
- Coordinates MUST be in the same units as the lengths in the question so the figure is to scale (e.g. a 5 cm side has length 5 between its endpoints). Put the figure in a sensible orientation like a textbook would.
- Every point referenced by a segment, rightAngle or angle must exist in points.
- Mark every right angle that the question states or implies with rightAngles.
- Put given lengths and unknowns (x, y, h …) as segment labels; put given angles and unknown angles (θ) in angles.
- For kind="geometry", axes must be null. For kind="coordinate", give axes ranges that contain all points and set showDot=true on plotted points.
- notToScale=false unless the question explicitly says the figure is not drawn to scale.`;

type Pt = { x: number; y: number };

export function pointMap(d: Diagram): Map<string, Pt> {
  return new Map(d.points.map((p) => [p.id, { x: p.x, y: p.y }]));
}

export function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Problems with the diagram itself (missing points, labels that disagree with coordinates, wrong right angles). */
export function checkDiagram(d: Diagram): string[] {
  const problems: string[] = [];
  const pts = pointMap(d);
  const need = (id: string, where: string) => {
    if (!pts.has(id)) problems.push(`Diagram ${where} refers to missing point "${id}"`);
    return pts.has(id);
  };

  for (const s of d.segments) {
    if (!need(s.from, "segment") || !need(s.to, "segment") || !s.label || d.notToScale) continue;
    const m = s.label.match(/^\s*(\d+(?:\.\d+)?)\s*(?:mm|cm|m|km|units?)?\s*$/);
    if (!m) continue;
    const stated = Number(m[1]);
    const actual = dist(pts.get(s.from)!, pts.get(s.to)!);
    if (Math.abs(actual - stated) > Math.max(0.05, stated * 0.02)) {
      problems.push(`Segment ${s.from}${s.to} is labelled ${s.label} but is drawn with length ${actual.toFixed(2)}`);
    }
  }

  for (const r of d.rightAngles) {
    if (!need(r.vertex, "right angle") || !need(r.a, "right angle") || !need(r.b, "right angle")) continue;
    const v = pts.get(r.vertex)!;
    const a = pts.get(r.a)!;
    const b = pts.get(r.b)!;
    const ua = { x: a.x - v.x, y: a.y - v.y };
    const ub = { x: b.x - v.x, y: b.y - v.y };
    const cos = (ua.x * ub.x + ua.y * ub.y) / (Math.hypot(ua.x, ua.y) * Math.hypot(ub.x, ub.y));
    if (!(Math.abs(cos) < 0.02)) {
      problems.push(`Angle ${r.a}${r.vertex}${r.b} is marked as a right angle but is not 90° in the drawing`);
    }
  }

  for (const an of d.angles) {
    need(an.vertex, "angle");
    need(an.a, "angle");
    need(an.b, "angle");
    if (d.notToScale || !an.label || !pts.has(an.vertex) || !pts.has(an.a) || !pts.has(an.b)) continue;
    const m = an.label.match(/^\s*(\d+(?:\.\d+)?)\s*°\s*$/);
    if (!m) continue;
    const drawn = angleDeg(pts.get(an.a)!, pts.get(an.vertex)!, pts.get(an.b)!);
    if (Math.abs(drawn - Number(m[1])) > 1.5) {
      problems.push(`Angle ${an.a}${an.vertex}${an.b} is labelled ${an.label} but is drawn as ${drawn.toFixed(1)}°`);
    }
  }
  return problems;
}

export function angleDeg(a: Pt, v: Pt, b: Pt) {
  const a1 = Math.atan2(a.y - v.y, a.x - v.x);
  const b1 = Math.atan2(b.y - v.y, b.x - v.x);
  let d = Math.abs(a1 - b1) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}
