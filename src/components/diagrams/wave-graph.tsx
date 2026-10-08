import type { WaveFigure } from "@/lib/schemas/physics-figure";
import { Arrow, Figure, LABEL, SMALL, type Pt } from "./svg-parts";

type Curve = WaveFigure["curve"];
const y = (c: Curve, s: number) => c.amplitude * Math.sin((2 * Math.PI * s) / c.spacing + (c.phase * Math.PI) / 180);

function niceStep(span: number) {
  const raw = span / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
const fmt = (v: number) => String(+v.toPrecision(4));

/** Displacement–distance or displacement–time graph of one or two sinusoids (superposition / stationary envelope). */
export function WaveGraph({ figure, maxWidth = 420, plotHeight = 170 }: { figure: WaveFigure; maxWidth?: number; plotHeight?: number }) {
  const f = figure;
  const left = 40, right = 78, top = 40, bottom = 22;
  const width = maxWidth, height = plotHeight + top + bottom;
  const plotW = width - left - right;
  const span = Math.max(f.to - f.from, 1e-9);
  const sumAmp = f.mode === "superposition" && f.second ? f.curve.amplitude + f.second.amplitude : Math.max(f.curve.amplitude, f.second?.amplitude ?? 0);
  const yMax = (sumAmp || 1) * 1.25;
  const P = (s: number, v: number): Pt => ({ x: left + ((s - f.from) / span) * plotW, y: top + plotHeight / 2 - (v / yMax) * (plotHeight / 2) });
  const path = (fn: (s: number) => number) => {
    const n = 240;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const s = f.from + (span * i) / n;
      const p = P(s, fn(s));
      d += `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
    }
    return d;
  };
  const els: React.ReactNode[] = [];
  let k = 0;
  const O = P(f.from, 0);
  const end = P(f.to, 0);

  // Axes
  els.push(<Arrow key={k++} from={{ x: O.x, y: O.y }} to={{ x: end.x + 22, y: O.y }} width={1.2} size={8} />);
  els.push(<Arrow key={k++} from={{ x: O.x, y: top + plotHeight }} to={{ x: O.x, y: top - 12 }} width={1.2} size={8} />);
  els.push(
    <text key={k++} x={end.x + 27} y={O.y + 4.5} className={LABEL}>
      {f.xLabel}
    </text>,
    <text key={k++} x={O.x + 8} y={top - 16} className={LABEL}>
      {f.yLabel}
    </text>,
  );
  const step = f.tickStep && f.tickStep > 0 && span / f.tickStep <= 24 ? f.tickStep : niceStep(span);
  for (let s = Math.ceil(f.from / step) * step; s <= f.to + 1e-9; s += step) {
    if (Math.abs(s - f.from) < 1e-9) continue;
    const p = P(s, 0);
    els.push(
      <line key={k++} x1={p.x} y1={p.y - 3} x2={p.x} y2={p.y + 3} stroke="currentColor" />,
      <text key={k++} x={p.x} y={p.y + 15} textAnchor="middle" className={SMALL}>
        {fmt(s)}
      </text>,
    );
  }
  for (const v of [f.curve.amplitude, -f.curve.amplitude]) {
    const p = P(f.from, v);
    els.push(
      <line key={k++} x1={p.x - 3} y1={p.y} x2={p.x + 3} y2={p.y} stroke="currentColor" />,
      <line key={k++} x1={p.x} y1={p.y} x2={end.x} y2={p.y} stroke="currentColor" strokeOpacity={0.18} strokeDasharray="2 4" />,
      <text key={k++} x={p.x - 6} y={p.y + 4} textAnchor="end" className={SMALL}>
        {fmt(v)}
      </text>,
    );
  }

  // Curves
  els.push(<path key={k++} d={path((s) => y(f.curve, s))} fill="none" stroke="currentColor" strokeWidth={f.mode === "superposition" ? 1.2 : 2} />);
  if (f.mode === "stationary") els.push(<path key={k++} d={path((s) => -y(f.curve, s))} fill="none" stroke="currentColor" strokeWidth={1.4} strokeDasharray="5 4" />);
  if (f.second) {
    const second = f.second;
    els.push(<path key={k++} d={path((s) => y(second, s))} fill="none" stroke="currentColor" strokeWidth={1.2} strokeDasharray="5 4" />);
    if (f.mode === "superposition") els.push(<path key={k++} d={path((s) => y(f.curve, s) + y(second, s))} fill="none" stroke="currentColor" strokeWidth={2.4} />);
  }
  // Curve labels: the main curve's label above its first crest, the second curve's below its first trough.
  const firstAt = (c: Curve, targetDeg: number) => {
    const frac = ((((targetDeg - c.phase - (360 * f.from) / c.spacing) % 360) + 360) % 360) / 360;
    return f.from + frac * c.spacing;
  };
  if (f.curve.label) {
    const s = firstAt(f.curve, 90);
    const p = P(s, y(f.curve, s));
    els.push(
      <text key={k++} x={p.x + 6} y={p.y - 6} className={LABEL}>
        {f.curve.label}
      </text>,
    );
  }
  if (f.second?.label) {
    const s = firstAt(f.second, 270);
    const p = P(s, y(f.second, s));
    els.push(
      <text key={k++} x={p.x + 6} y={p.y + 16} className={LABEL}>
        {f.second.label}
      </text>,
    );
  }

  // Marked particles / instants
  for (const pt of f.points) {
    const p = P(pt.at, y(f.curve, pt.at));
    els.push(
      <circle key={k++} cx={p.x} cy={p.y} r={3.2} fill="currentColor" />,
      <text key={k++} x={p.x + 5} y={p.y - 7} className="fill-current font-serif text-[13px] italic">
        {pt.label}
      </text>,
    );
  }

  // Direction of travel
  if (f.direction && f.axis === "x") {
    const yA = top + 4;
    const xMid = left + plotW * 0.72;
    const a = { x: xMid - 22, y: yA }, b = { x: xMid + 22, y: yA };
    els.push(<Arrow key={k++} from={f.direction === "right" ? a : b} to={f.direction === "right" ? b : a} width={1.6} size={8} />);
  }

  const kindText = f.axis === "x" ? "Displacement–distance graph" : "Displacement–time graph";
  const label = `${kindText}: amplitude ${f.curve.amplitude}, ${f.axis === "x" ? "wavelength" : "period"} ${f.curve.spacing}${f.second ? `; second wave amplitude ${f.second.amplitude}` : ""}${f.direction ? `; travelling to the ${f.direction}` : ""}`;
  return (
    <Figure width={width} height={height} label={label}>
      {els}
    </Figure>
  );
}
