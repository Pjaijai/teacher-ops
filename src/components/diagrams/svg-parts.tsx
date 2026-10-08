/** Small SVG pieces shared by the physics diagrams. Everything is drawn in currentColor, so it follows the theme. */

export type Pt = { x: number; y: number };

export const LABEL = "fill-current text-[13px]";
export const SMALL = "fill-muted-foreground text-[11px]";

/** A filled arrowhead with its tip at `tip`, pointing along `dir` (pixels). */
export function Arrowhead({ tip, dir, size = 8 }: { tip: Pt; dir: Pt; size?: number }) {
  const L = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / L, uy = dir.y / L;
  const bx = tip.x - ux * size, by = tip.y - uy * size;
  const w = size * 0.45;
  return <path d={`M ${tip.x} ${tip.y} L ${bx - uy * w} ${by + ux * w} L ${bx + uy * w} ${by - ux * w} Z`} fill="currentColor" />;
}

/** A line with an arrowhead at its end. */
export function Arrow({ from, to, width = 1.8, dashed = false, size = 9 }: { from: Pt; to: Pt; width?: number; dashed?: boolean; size?: number }) {
  const d = { x: to.x - from.x, y: to.y - from.y };
  const L = Math.hypot(d.x, d.y) || 1;
  const end = { x: to.x - (d.x / L) * size * 0.6, y: to.y - (d.y / L) * size * 0.6 };
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={end.x} y2={end.y} stroke="currentColor" strokeWidth={width} strokeDasharray={dashed ? "5 4" : undefined} />
      <Arrowhead tip={to} dir={d} size={size} />
    </g>
  );
}

/** Text anchor so a label placed at `offset` from its anchor point never overlaps the thing it labels. */
export function anchorFor(offsetX: number): "start" | "middle" | "end" {
  return offsetX > 0.35 ? "start" : offsetX < -0.35 ? "end" : "middle";
}

export function Figure({ width, height, label, caption, children }: { width: number; height: number; label: string; caption?: string | null; children: React.ReactNode }) {
  return (
    <figure className="my-3 inline-block max-w-full">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto max-w-full">
        <title>{label}</title>
        {children}
      </svg>
      {caption && <figcaption className="text-muted-foreground mt-1 text-xs">{caption}</figcaption>}
    </figure>
  );
}
