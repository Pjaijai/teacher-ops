import type { RayFigure } from "@/lib/schemas/physics-figure";
import { Arrow, Arrowhead, Figure, LABEL, type Pt } from "./svg-parts";

const ELEMENT_NAMES: Record<RayFigure["element"]["type"], string> = {
  convex_lens: "convex lens",
  concave_lens: "concave lens",
  plane_mirror: "plane mirror",
  concave_mirror: "concave mirror",
  convex_mirror: "convex mirror",
};

/** Ray diagram on the principal axis: lens or mirror at x = 0, object arrow, image arrow, rays. Equal x/y scale. */
export function RayDiagram({ figure, maxWidth = 440, maxHeight = 280 }: { figure: RayFigure; maxWidth?: number; maxHeight?: number }) {
  const r = figure;
  const w = r.window;
  const spanX = Math.max(w.xMax - w.xMin, 1e-6), spanY = Math.max(w.yMax - w.yMin, 1e-6);
  const pad = 22;
  const scale = Math.min((maxWidth - 2 * pad) / spanX, (maxHeight - 2 * pad) / spanY);
  const width = spanX * scale + 2 * pad, height = spanY * scale + 2 * pad;
  const P = (x: number, y: number): Pt => ({ x: pad + (x - w.xMin) * scale, y: pad + (w.yMax - y) * scale });
  const O = P(0, 0);
  const els: React.ReactNode[] = [];
  let k = 0;

  if (r.gridSpacing && r.gridSpacing > 0 && spanX / r.gridSpacing <= 60 && spanY / r.gridSpacing <= 60) {
    const g = r.gridSpacing;
    for (let x = Math.ceil(w.xMin / g) * g; x <= w.xMax + 1e-9; x += g) {
      const a = P(x, w.yMin), b = P(x, w.yMax);
      els.push(<line key={k++} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity={0.15} strokeWidth={0.8} />);
    }
    for (let y = Math.ceil(w.yMin / g) * g; y <= w.yMax + 1e-9; y += g) {
      const a = P(w.xMin, y), b = P(w.xMax, y);
      els.push(<line key={k++} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity={0.15} strokeWidth={0.8} />);
    }
  }

  // Principal axis
  els.push(<line key={k++} x1={pad - 6} y1={O.y} x2={width - pad + 6} y2={O.y} stroke="currentColor" strokeWidth={1} />);

  // Element
  const H = r.element.halfHeight ? r.element.halfHeight * scale : Math.min(O.y - pad + 2, height - pad - O.y + 2, Math.max(spanY * scale * 0.42, 40));
  const t = r.element.type;
  const elem = (() => {
    const x = O.x, y = O.y;
    if (t === "convex_lens") return <path d={`M ${x} ${y - H} Q ${x + 12} ${y} ${x} ${y + H} Q ${x - 12} ${y} ${x} ${y - H} Z`} fill="none" stroke="currentColor" strokeWidth={1.6} />;
    if (t === "concave_lens")
      return <path d={`M ${x - 8} ${y - H} L ${x + 8} ${y - H} Q ${x + 1} ${y} ${x + 8} ${y + H} L ${x - 8} ${y + H} Q ${x - 1} ${y} ${x - 8} ${y - H} Z`} fill="none" stroke="currentColor" strokeWidth={1.6} />;
    // Mirrors: reflecting side faces the object (left); hatching behind.
    const sag = t === "plane_mirror" ? 0 : t === "concave_mirror" ? -10 : 10;
    const hatch: React.ReactNode[] = [];
    for (let i = -H; i <= H - 6; i += 8) {
      const yy = y + i;
      const xx = x + sag * (i / H) ** 2; // follows the parabola-like mirror curve
      hatch.push(<line key={i} x1={xx + 1} y1={yy} x2={xx + 8} y2={yy + 6} stroke="currentColor" strokeWidth={1} />);
    }
    return (
      <g>
        <path d={`M ${x + sag} ${y - H} Q ${x - sag} ${y} ${x + sag} ${y + H}`} fill="none" stroke="currentColor" strokeWidth={2} />
        {hatch}
      </g>
    );
  })();
  els.push(<g key={k++}>{elem}</g>);

  // Focal points
  if (r.showFocalPoints && r.element.focalLength && t !== "plane_mirror") {
    const f = r.element.focalLength;
    const xsF = t.endsWith("lens") ? [-f, f] : t === "concave_mirror" ? [-f] : [f];
    for (const fx of xsF) {
      const p = P(fx, 0);
      els.push(
        <g key={k++}>
          <circle cx={p.x} cy={p.y} r={2.6} fill="currentColor" />
          <text x={p.x} y={p.y + 16} textAnchor="middle" className="fill-current font-serif text-[13px] italic">
            F
          </text>
        </g>,
      );
    }
  }

  // Rays (behind the arrows)
  for (const ray of r.rays) {
    const pts = ray.points.map((p) => P(p.x, p.y));
    els.push(
      <polyline key={k++} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={1.2} strokeDasharray={ray.dashed ? "5 4" : undefined} />,
    );
    if (ray.arrow && !ray.dashed) {
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1];
        const d = { x: b.x - a.x, y: b.y - a.y };
        if (Math.hypot(d.x, d.y) < 24) continue;
        els.push(<Arrowhead key={k++} tip={{ x: a.x + d.x * 0.55, y: a.y + d.y * 0.55 }} dir={d} size={7} />);
      }
    }
  }

  const arrowAt = (x: number, h: number, label: string, dashed: boolean) => {
    const base = P(x, 0), tip = P(x, h);
    const below = h >= 0;
    return (
      <g key={k++}>
        <Arrow from={base} to={tip} width={2.2} dashed={dashed} size={10} />
        <text x={base.x} y={below ? base.y + 16 : base.y - 7} textAnchor="middle" className={LABEL}>
          {label}
        </text>
      </g>
    );
  };
  if (r.object) els.push(arrowAt(r.object.x, r.object.height, r.object.label, false));
  if (r.image) els.push(arrowAt(r.image.x, r.image.height, r.image.label, r.image.virtual));

  const desc = [
    ELEMENT_NAMES[t],
    r.element.focalLength ? `focal length ${r.element.focalLength}` : null,
    r.object ? `object at ${-r.object.x} from the ${t.endsWith("lens") ? "lens" : "mirror"}, height ${r.object.height}` : null,
    r.image ? `${r.image.virtual ? "virtual" : "real"} image at x = ${r.image.x}, height ${r.image.height}` : null,
  ]
    .filter(Boolean)
    .join("; ");
  return (
    <Figure width={width} height={height} label={`Ray diagram: ${desc}`} caption={r.scaleNote}>
      {els}
    </Figure>
  );
}
