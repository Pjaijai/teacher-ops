import type { CircuitComponent, CircuitFigure } from "@/lib/schemas/physics-figure";
import { anchorFor, Arrowhead, Figure, LABEL, type Pt } from "./svg-parts";

/** Half-length (px) of each symbol along its wire; the wire is drawn up to the symbol. */
const HALF: Record<CircuitComponent["type"], number> = {
  wire: 0,
  cell: 4,
  battery: 13,
  resistor: 17,
  variable_resistor: 17,
  lamp: 11,
  switch: 14,
  ammeter: 12,
  voltmeter: 12,
  fuse: 14,
  diode: 8,
  capacitor: 4,
};

/** How far each symbol reaches either side of its wire (px), so labels clear it. */
const REACH: Record<CircuitComponent["type"], number> = {
  wire: 2,
  cell: 13,
  battery: 13,
  resistor: 6,
  variable_resistor: 14,
  lamp: 11,
  switch: 12,
  ammeter: 12,
  voltmeter: 12,
  fuse: 5,
  diode: 8,
  capacitor: 12,
};

/** The symbol in local coordinates: centred at 0, wire along +x (from → to). */
function ComponentSymbol({ c }: { c: CircuitComponent }) {
  const s = { stroke: "currentColor", strokeWidth: 1.6, fill: "none" } as const;
  switch (c.type) {
    case "cell":
      return (
        <g>
          <line x1={-4} y1={-6} x2={-4} y2={6} stroke="currentColor" strokeWidth={3.2} />
          <line x1={4} y1={-13} x2={4} y2={13} stroke="currentColor" strokeWidth={1.6} />
        </g>
      );
    case "battery":
      return (
        <g>
          <line x1={-13} y1={-6} x2={-13} y2={6} stroke="currentColor" strokeWidth={3.2} />
          <line x1={-5} y1={-13} x2={-5} y2={13} {...s} />
          <line x1={-5} y1={0} x2={5} y2={0} {...s} strokeDasharray="2 2" />
          <line x1={5} y1={-6} x2={5} y2={6} stroke="currentColor" strokeWidth={3.2} />
          <line x1={13} y1={-13} x2={13} y2={13} {...s} />
        </g>
      );
    case "resistor":
      return <rect x={-17} y={-6} width={34} height={12} {...s} className="fill-background" />;
    case "variable_resistor":
      return (
        <g>
          <rect x={-17} y={-6} width={34} height={12} {...s} className="fill-background" />
          <line x1={-14} y1={12} x2={11} y2={-10} {...s} />
          <Arrowhead tip={{ x: 15, y: -14 }} dir={{ x: 25, y: -22 }} size={7} />
        </g>
      );
    case "lamp":
      return (
        <g>
          <circle r={11} {...s} className="fill-background" />
          <line x1={-7.8} y1={-7.8} x2={7.8} y2={7.8} {...s} />
          <line x1={-7.8} y1={7.8} x2={7.8} y2={-7.8} {...s} />
        </g>
      );
    case "switch":
      return (
        <g>
          <circle cx={-14} r={2.2} fill="currentColor" />
          <circle cx={14} r={2.2} fill="currentColor" />
          <line x1={-14} y1={0} x2={c.closed ? 14 : 10} y2={c.closed ? 0 : -12} {...s} />
        </g>
      );
    case "ammeter":
    case "voltmeter":
      return <circle r={12} {...s} className="fill-background" />;
    case "fuse":
      return (
        <g>
          <rect x={-14} y={-5} width={28} height={10} {...s} className="fill-background" />
          <line x1={-14} y1={0} x2={14} y2={0} {...s} />
        </g>
      );
    case "diode":
      return (
        <g>
          <path d="M -8 -8 L -8 8 L 6 0 Z" {...s} />
          <line x1={6} y1={-8} x2={6} y2={8} {...s} />
          <line x1={-8} y1={0} x2={6} y2={0} {...s} />
        </g>
      );
    case "capacitor":
      return (
        <g>
          <line x1={-4} y1={-12} x2={-4} y2={12} {...s} />
          <line x1={4} y1={-12} x2={4} y2={12} {...s} />
        </g>
      );
    default:
      return null;
  }
}

const NAMES: Record<CircuitComponent["type"], string> = {
  wire: "wire",
  cell: "cell",
  battery: "battery",
  resistor: "resistor",
  variable_resistor: "variable resistor",
  lamp: "lamp",
  switch: "switch",
  ammeter: "ammeter",
  voltmeter: "voltmeter",
  fuse: "fuse",
  diode: "diode",
  capacitor: "capacitor",
};

/** Exam-style circuit diagram: components on the straight wire between two grid nodes. Pure function of the data. */
export function CircuitDiagram({ figure, maxWidth = 380, maxHeight = 280 }: { figure: CircuitFigure; maxWidth?: number; maxHeight?: number }) {
  const f = figure;
  if (f.nodes.length === 0) return null;
  const xs = f.nodes.map((n) => n.x), ys = f.nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = 64, padY = 42; // room for labels such as "R₁ = 12 Ω" beside vertical branches
  const scale = Math.min(64, (maxWidth - 2 * padX) / Math.max(maxX - minX, 1e-6), (maxHeight - 2 * padY) / Math.max(maxY - minY, 1e-6));
  const width = Math.max((maxX - minX) * scale + 2 * padX, 120);
  const height = Math.max((maxY - minY) * scale + 2 * padY, 80);
  const P = (x: number, y: number): Pt => ({ x: padX + (x - minX) * scale, y: height - padY - (y - minY) * scale });
  const pos = new Map(f.nodes.map((n) => [n.id, P(n.x, n.y)]));
  const centre = { x: width / 2, y: height / 2 };
  const degree = new Map<string, number>();
  for (const c of f.components) for (const id of [c.from, c.to]) degree.set(id, (degree.get(id) ?? 0) + 1);

  const els: React.ReactNode[] = [];
  f.components.forEach((c, i) => {
    const a = pos.get(c.from), b = pos.get(c.to);
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const u = { x: dx / L, y: dy / L };
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const h = Math.min(HALF[c.type], L / 2 - 2);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const s = { x: mid.x - u.x * h, y: mid.y - u.y * h }, e = { x: mid.x + u.x * h, y: mid.y + u.y * h };
    els.push(
      <g key={`c${i}`}>
        <line x1={a.x} y1={a.y} x2={s.x} y2={s.y} stroke="currentColor" strokeWidth={1.6} />
        <line x1={e.x} y1={e.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth={1.6} />
        {c.type !== "wire" && (
          <g transform={`translate(${mid.x} ${mid.y}) rotate(${angle})`}>
            <ComponentSymbol c={c} />
          </g>
        )}
        {(c.type === "ammeter" || c.type === "voltmeter") && (
          <text x={mid.x} y={mid.y + 4.5} textAnchor="middle" className="fill-current text-[13px] font-semibold">
            {c.type === "ammeter" ? "A" : "V"}
          </text>
        )}
      </g>,
    );
    if (c.label) {
      let n = { x: -u.y, y: u.x };
      if ((mid.x - centre.x) * n.x + (mid.y - centre.y) * n.y < 0) n = { x: -n.x, y: -n.y };
      // Labels sit on the side of the wire facing away from the middle of the circuit, clear of the symbol.
      const off = REACH[c.type] + 7;
      const at = { x: mid.x + n.x * off, y: mid.y + n.y * off };
      const dy = n.y > 0.5 ? 11 : n.y < -0.5 ? -2 : 4.5;
      els.push(
        <text key={`l${i}`} x={at.x} y={at.y + dy} textAnchor={anchorFor(n.x)} className={LABEL}>
          {c.label}
        </text>,
      );
    }
  });
  for (const n of f.nodes) {
    const p = pos.get(n.id)!;
    const d = degree.get(n.id) ?? 0;
    if (d >= 3) els.push(<circle key={`j${n.id}`} cx={p.x} cy={p.y} r={3} fill="currentColor" />);
    else if (d === 1) els.push(<circle key={`t${n.id}`} cx={p.x} cy={p.y} r={3.2} fill="none" stroke="currentColor" strokeWidth={1.4} className="fill-background" />);
    if (n.label) {
      // Put the label in the free direction (no wire there) that points most away from the circuit's middle.
      const away = { x: p.x - centre.x, y: p.y - centre.y };
      const aL = Math.hypot(away.x, away.y) || 1;
      const wires = f.components
        .filter((c) => c.from === n.id || c.to === n.id)
        .map((c) => pos.get(c.from === n.id ? c.to : c.from))
        .filter((q): q is Pt => Boolean(q))
        .map((q) => {
          const L = Math.hypot(q.x - p.x, q.y - p.y) || 1;
          return { x: (q.x - p.x) / L, y: (q.y - p.y) / L };
        });
      let best = { x: 0.7071, y: -0.7071 }, bestScore = -Infinity;
      for (let a = 0; a < 8; a++) {
        const d = { x: Math.cos((a * Math.PI) / 4), y: Math.sin((a * Math.PI) / 4) };
        const clash = Math.max(-1, ...wires.map((w) => w.x * d.x + w.y * d.y));
        const score = (away.x * d.x + away.y * d.y) / aL - 3 * Math.max(0, clash - 0.2) + (a % 2 ? 0.3 : 0);
        if (score > bestScore) (bestScore = score), (best = d);
      }
      const at = { x: p.x + best.x * 13, y: p.y + best.y * 13 };
      els.push(
        <text key={`n${n.id}`} x={at.x} y={at.y + 5 + best.y * 3} textAnchor={anchorFor(best.x)} className="fill-current font-serif text-[14px] italic">
          {n.label}
        </text>,
      );
    }
  }

  const parts = f.components.filter((c) => c.type !== "wire").map((c) => `${NAMES[c.type]}${c.label ? ` ${c.label}` : ""}`);
  return (
    <Figure width={width} height={height} label={`Circuit diagram: ${parts.join(", ")}`}>
      {els}
    </Figure>
  );
}
