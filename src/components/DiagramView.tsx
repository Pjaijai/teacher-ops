import type { Diagram } from "@/lib/diagram";

type Pt = { x: number; y: number };
const sub = (a: Pt, b: Pt) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Pt, k: number) => ({ x: a.x * k, y: a.y * k });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const unit = (a: Pt) => (len(a) === 0 ? { x: 0, y: 0 } : mul(a, 1 / len(a)));

/** Draws a structured diagram as an exam-style SVG. Pure function of the data. */
export function DiagramView({ diagram, maxWidth = 340, maxHeight = 260 }: { diagram: Diagram; maxWidth?: number; maxHeight?: number }) {
  const d = diagram;
  const xs = d.points.map((p) => p.x);
  const ys = d.points.map((p) => p.y);
  if (d.axes) xs.push(d.axes.xMin, d.axes.xMax), ys.push(d.axes.yMin, d.axes.yMax);
  if (xs.length === 0) return null;

  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);
  // Wider side padding leaves room for length labels like "12 cm" beside vertical edges.
  const padX = 58, padY = 30;
  const scale = Math.min((maxWidth - 2 * padX) / spanX, (maxHeight - 2 * padY) / spanY);
  const width = spanX * scale + 2 * padX;
  const height = spanY * scale + 2 * padY;
  const toPx = (p: Pt): Pt => ({ x: padX + (p.x - minX) * scale, y: padY + (maxY - p.y) * scale });

  const px = new Map(d.points.map((p) => [p.id, toPx(p)]));
  const get = (id: string) => px.get(id);
  const allPx = [...px.values()];
  const centroid = allPx.length
    ? mul(allPx.reduce((s, p) => add(s, p), { x: 0, y: 0 }), 1 / allPx.length)
    : { x: width / 2, y: height / 2 };

  const els: React.ReactNode[] = [];
  let k = 0;

  if (d.axes) {
    const { xMin, xMax, yMin, yMax, tickStep } = d.axes;
    const o = toPx({ x: 0, y: 0 });
    const left = toPx({ x: xMin, y: 0 }), right = toPx({ x: xMax, y: 0 });
    const bottom = toPx({ x: 0, y: yMin }), top = toPx({ x: 0, y: yMax });
    els.push(
      <line key={k++} x1={left.x} y1={o.y} x2={right.x + 10} y2={o.y} stroke="currentColor" markerEnd="url(#arrow)" />,
      <line key={k++} x1={o.x} y1={bottom.y} x2={o.x} y2={top.y - 10} stroke="currentColor" markerEnd="url(#arrow)" />,
      <text key={k++} x={right.x + 12} y={o.y + 16} className="dg-label">x</text>,
      <text key={k++} x={o.x + 8} y={top.y - 8} className="dg-label">y</text>,
      <text key={k++} x={o.x - 14} y={o.y + 16} className="dg-label">O</text>,
    );
    if (tickStep > 0 && (xMax - xMin) / tickStep <= 30 && (yMax - yMin) / tickStep <= 30) {
      for (let t = Math.ceil(xMin / tickStep) * tickStep; t <= xMax + 1e-9; t += tickStep) {
        if (Math.abs(t) < 1e-9) continue;
        const p = toPx({ x: t, y: 0 });
        els.push(
          <line key={k++} x1={p.x} y1={p.y - 3} x2={p.x} y2={p.y + 3} stroke="currentColor" />,
          <text key={k++} x={p.x} y={p.y + 15} className="dg-tick" textAnchor="middle">{+t.toFixed(4)}</text>,
        );
      }
      for (let t = Math.ceil(yMin / tickStep) * tickStep; t <= yMax + 1e-9; t += tickStep) {
        if (Math.abs(t) < 1e-9) continue;
        const p = toPx({ x: 0, y: t });
        els.push(
          <line key={k++} x1={p.x - 3} y1={p.y} x2={p.x + 3} y2={p.y} stroke="currentColor" />,
          <text key={k++} x={p.x - 7} y={p.y + 4} className="dg-tick" textAnchor="end">{+t.toFixed(4)}</text>,
        );
      }
    }
  }

  for (const s of d.segments) {
    const a = get(s.from), b = get(s.to);
    if (!a || !b) continue;
    els.push(
      <line key={k++} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth={1.6} strokeDasharray={s.dashed ? "5 4" : undefined} />,
    );
    if (s.label) {
      const mid = mul(add(a, b), 0.5);
      const dir = unit(sub(b, a));
      let normal = { x: -dir.y, y: dir.x };
      // Put the label on the side away from the figure's centre.
      if ((mid.x - centroid.x) * normal.x + (mid.y - centroid.y) * normal.y < 0) normal = mul(normal, -1);
      const at = add(mid, mul(normal, 10));
      // Anchor the text on the side facing away from the line so it never overlaps it.
      const anchor = normal.x > 0.35 ? "start" : normal.x < -0.35 ? "end" : "middle";
      els.push(
        <text key={k++} x={at.x} y={at.y + 5 + normal.y * 4} className="dg-label" textAnchor={anchor}>{s.label}</text>,
      );
    }
  }

  for (const r of d.rightAngles) {
    const v = get(r.vertex), a = get(r.a), b = get(r.b);
    if (!v || !a || !b) continue;
    const size = Math.min(11, len(sub(a, v)) * 0.3, len(sub(b, v)) * 0.3);
    const ua = mul(unit(sub(a, v)), size), ub = mul(unit(sub(b, v)), size);
    const p1 = add(v, ua), p2 = add(add(v, ua), ub), p3 = add(v, ub);
    els.push(<polyline key={k++} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill="none" stroke="currentColor" strokeWidth={1.2} />);
  }

  for (const an of d.angles) {
    const v = get(an.vertex), a = get(an.a), b = get(an.b);
    if (!v || !a || !b) continue;
    const r = Math.min(20, len(sub(a, v)) * 0.35, len(sub(b, v)) * 0.35);
    const ua = unit(sub(a, v)), ub = unit(sub(b, v));
    const s = add(v, mul(ua, r)), e = add(v, mul(ub, r));
    const cross = ua.x * ub.y - ua.y * ub.x;
    els.push(<path key={k++} d={`M ${s.x} ${s.y} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${e.x} ${e.y}`} fill="none" stroke="currentColor" strokeWidth={1.2} />);
    if (an.label) {
      const bis = unit(add(ua, ub));
      const at = add(v, mul(bis, r + 13));
      els.push(<text key={k++} x={at.x} y={at.y + 5} className="dg-label" textAnchor="middle">{an.label}</text>);
    }
  }

  for (const p of d.points) {
    const at = px.get(p.id)!;
    if (p.showDot) els.push(<circle key={k++} cx={at.x} cy={at.y} r={2.6} fill="currentColor" />);
    if (p.showLabel) {
      const away = unit(sub(at, centroid));
      const dir = len(away) === 0 ? { x: 0, y: -1 } : away;
      const lp = add(at, mul(dir, 14));
      els.push(<text key={k++} x={lp.x} y={lp.y + 5} className="dg-point" textAnchor="middle">{p.id}</text>);
    }
  }

  return (
    <figure className="diagram">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Question figure">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {els}
      </svg>
      {d.notToScale && <figcaption>The figure is not drawn to scale. 圖中所示並非按比例繪畫。</figcaption>}
    </figure>
  );
}
