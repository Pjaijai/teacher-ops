import type { FreeBodyFigure } from "@/lib/schemas/physics-figure";
import { anchorFor, Arrow, Figure, LABEL, type Pt } from "./svg-parts";

const rad = (d: number) => (d * Math.PI) / 180;

/** Free-body diagram: a body (box, circle or particle) with labelled force arrows from its centre. */
export function FreeBodyDiagram({ figure, size = 300 }: { figure: FreeBodyFigure; size?: number }) {
  const f = figure;
  const width = size, height = Math.round(size * 0.9);
  const c: Pt = { x: width / 2, y: height / 2 };
  const theta = f.surface === "incline" ? (f.inclineAngle ?? 30) : 0;
  const bw = 58, bh = 40, br = 22;
  const halfDown = f.body.shape === "box" ? bh / 2 : f.body.shape === "circle" ? br : 3;
  const els: React.ReactNode[] = [];
  let k = 0;

  // Surface
  if (f.surface === "ground" || f.surface === "incline") {
    const t = { x: Math.cos(rad(theta)), y: -Math.sin(rad(theta)) }; // along the slope (screen coords)
    const n = { x: -Math.sin(rad(theta)), y: -Math.cos(rad(theta)) }; // outward normal (screen)
    const foot = { x: c.x - n.x * halfDown, y: c.y - n.y * halfDown };
    const a = { x: foot.x - t.x * width * 0.42, y: foot.y - t.y * width * 0.42 };
    const b = { x: foot.x + t.x * width * 0.38, y: foot.y + t.y * width * 0.38 };
    els.push(<line key={k++} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth={1.6} />);
    if (f.surface === "incline") {
      els.push(
        <polyline key={k++} points={`${a.x},${a.y} ${b.x},${a.y} ${b.x},${b.y}`} fill="none" stroke="currentColor" strokeWidth={1.2} />,
      );
      if (f.showAngle) {
        const R = 34;
        const e = { x: a.x + R * Math.cos(rad(theta)), y: a.y - R * Math.sin(rad(theta)) };
        els.push(
          <path key={k++} d={`M ${a.x + R} ${a.y} A ${R} ${R} 0 0 0 ${e.x} ${e.y}`} fill="none" stroke="currentColor" strokeWidth={1.1} />,
          <text key={k++} x={a.x + R + 6} y={a.y - R * Math.sin(rad(theta / 2)) + 4} className={LABEL}>
            {`${+theta.toFixed(1)}°`}
          </text>,
        );
      }
    } else {
      for (let x = a.x + 6; x < b.x; x += 10) els.push(<line key={k++} x1={x} y1={a.y} x2={x - 7} y2={a.y + 7} stroke="currentColor" strokeWidth={0.9} />);
    }
  }
  if (f.surface === "wall") {
    const half = f.body.shape === "box" ? bw / 2 : f.body.shape === "circle" ? br : 3;
    const x = c.x - half;
    els.push(<line key={k++} x1={x} y1={c.y - 80} x2={x} y2={c.y + 80} stroke="currentColor" strokeWidth={1.6} />);
    for (let y = c.y - 76; y < c.y + 80; y += 10) els.push(<line key={k++} x1={x} y1={y} x2={x - 7} y2={y + 7} stroke="currentColor" strokeWidth={0.9} />);
  }

  // Body
  if (f.body.shape === "box")
    els.push(
      <rect key={k++} x={c.x - bw / 2} y={c.y - bh / 2} width={bw} height={bh} transform={`rotate(${-theta} ${c.x} ${c.y})`} fill="none" stroke="currentColor" strokeWidth={1.6} className="fill-background" />,
    );
  else if (f.body.shape === "circle") els.push(<circle key={k++} cx={c.x} cy={c.y} r={br} fill="none" stroke="currentColor" strokeWidth={1.6} className="fill-background" />);
  if (f.body.label) {
    // Outside the body, top-left, so force arrows from the centre don't cross it.
    const r = f.body.shape === "box" ? Math.hypot(bw, bh) / 2 : f.body.shape === "circle" ? br : 4;
    els.push(
      <text key={k++} x={c.x - r * 0.75 - 4} y={c.y - r * 0.75 - 4} textAnchor="end" className="fill-muted-foreground text-[12px]">
        {f.body.label}
      </text>,
    );
  }
  if (f.body.shape === "point") els.push(<circle key={k++} cx={c.x} cy={c.y} r={3.2} fill="currentColor" />);

  // Forces
  const mags = f.forces.map((x) => x.magnitude);
  const allKnown = mags.length > 0 && mags.every((m) => m !== null && m > 0);
  const max = allKnown ? Math.max(...(mags as number[])) : 1;
  const longest = Math.min(width, height) * 0.4;
  for (const force of f.forces) {
    const L = allKnown ? Math.max(28, (force.magnitude! / max) * longest) : longest * 0.8;
    const d = { x: Math.cos(rad(force.angle)), y: -Math.sin(rad(force.angle)) };
    const tip = { x: c.x + d.x * L, y: c.y + d.y * L };
    els.push(<Arrow key={k++} from={c} to={tip} width={2} size={10} />);
    const at = { x: tip.x + d.x * 12, y: tip.y + d.y * 12 };
    els.push(
      <text key={k++} x={at.x} y={at.y + 4.5 + d.y * 4} textAnchor={anchorFor(d.x)} className={LABEL}>
        {force.label}
      </text>,
    );
  }
  els.push(<circle key={k++} cx={c.x} cy={c.y} r={2.4} fill="currentColor" />);

  const label = `Free-body diagram${f.surface === "incline" ? ` on a ${+theta.toFixed(1)}° incline` : ""}: ${f.forces
    .map((x) => `${x.label} at ${x.angle}°${x.magnitude !== null ? ` (${x.magnitude} N)` : ""}`)
    .join(", ")}`;
  return (
    <Figure width={width} height={height} label={label}>
      {els}
    </Figure>
  );
}
