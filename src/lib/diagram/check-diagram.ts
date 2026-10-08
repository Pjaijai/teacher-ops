import type { Diagram } from "@/lib/schemas/diagram";

type Pt = { x: number; y: number };

export function pointMap(d: Diagram): Map<string, Pt> {
  return new Map(d.points.map((p) => [p.id, { x: p.x, y: p.y }]));
}

export function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleDeg(a: Pt, v: Pt, b: Pt) {
  const a1 = Math.atan2(a.y - v.y, a.x - v.x);
  const b1 = Math.atan2(b.y - v.y, b.x - v.x);
  let d = Math.abs(a1 - b1) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}

/** Problems with the figure itself: missing points, labels that disagree with coordinates, wrong right angles. */
export function checkDiagram(d: Diagram): string[] {
  const problems: string[] = [];
  const pts = pointMap(d);
  const need = (id: string, where: string) => {
    if (!pts.has(id)) problems.push(`Figure ${where} refers to missing point "${id}"`);
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

  for (const c of d.circles) need(c.center, "circle");

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
