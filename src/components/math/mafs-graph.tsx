"use client";

import { compile } from "mathjs";
import { Coordinates, Line, Mafs, Plot, Point, Polygon, Text, Theme } from "mafs";
import "mafs/core.css";
import { useMemo } from "react";
import type { Graph } from "@/lib/schemas/diagram";

const COLORS = [Theme.blue, Theme.red, Theme.green, Theme.orange, Theme.violet];

/** Names the AI may use in graph expressions besides mathjs built-ins (log = ln, e, pi, sin …). */
const SCOPE = { ln: Math.log };

type Fn = (x: number) => number;

function toFn(expr: string): Fn | null {
  try {
    const code = compile(expr);
    return (x: number) => {
      try {
        const y = Number(code.evaluate({ ...SCOPE, x }));
        return Number.isFinite(y) ? y : NaN;
      } catch {
        return NaN;
      }
    };
  } catch {
    return null;
  }
}

/** Outline of the region between `upper` and `lower` over [a, b], sampled finely (skips undefined points). */
function regionPolygon(upper: Fn, lower: Fn, a: number, b: number, n = 160): [number, number][] {
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const u = upper(x);
    const l = lower(x);
    if (!Number.isFinite(u) || !Number.isFinite(l)) continue;
    top.push([x, u]);
    bottom.push([x, l]);
  }
  return [...top, ...bottom.reverse()];
}

/** Function graphs from a GraphSpec (expressions are mathjs in x): curves, points, asymptotes, shaded regions. */
export function MafsGraph({ graph, height = 300 }: { graph: Graph; height?: number }) {
  const fns = useMemo(() => graph.functions.map((f) => toFn(f.expr)), [graph.functions]);
  const regions = useMemo(
    () =>
      (graph.regions ?? []).map((r) => {
        const upper = toFn(r.upper);
        const lower = toFn(r.lower);
        if (!upper || !lower) return null;
        const a = Math.max(Math.min(r.from, r.to), graph.xMin);
        const b = Math.min(Math.max(r.from, r.to), graph.xMax);
        if (!(a < b)) return null;
        const pts = regionPolygon(upper, lower, a, b);
        if (pts.length < 3) return null;
        const mid = (a + b) / 2;
        const labelY = (upper(mid) + lower(mid)) / 2;
        return { pts, label: r.label, at: [mid, Number.isFinite(labelY) ? labelY : 0] as [number, number] };
      }),
    [graph.regions, graph.xMin, graph.xMax],
  );
  const xSpan = graph.xMax - graph.xMin;
  const ySpan = graph.yMax - graph.yMin;

  return (
    <div className="my-3 overflow-hidden rounded-md border">
      <Mafs height={height} viewBox={{ x: [graph.xMin, graph.xMax], y: [graph.yMin, graph.yMax] }} preserveAspectRatio={false} pan={false}>
        <Coordinates.Cartesian />
        {regions.map((r, i) =>
          r ? (
            <g key={`r${i}`}>
              <Polygon points={r.pts} color={Theme.indigo} fillOpacity={0.22} strokeOpacity={0} weight={0} />
              {r.label && (
                <Text x={r.at[0]} y={r.at[1]} size={14}>
                  {r.label}
                </Text>
              )}
            </g>
          ) : null,
        )}
        {(graph.asymptotes ?? []).map((a, i) => {
          const vertical = a.axis === "vertical";
          const p1: [number, number] = vertical ? [a.value, graph.yMin] : [graph.xMin, a.value];
          const p2: [number, number] = vertical ? [a.value, graph.yMax] : [graph.xMax, a.value];
          return (
            <g key={`a${i}`}>
              <Line.ThroughPoints point1={p1} point2={p2} style="dashed" color={Theme.foreground} opacity={0.55} weight={1.5} />
              {a.label && (
                <Text
                  x={vertical ? a.value : graph.xMax - xSpan * 0.08}
                  y={vertical ? graph.yMax - ySpan * 0.06 : a.value}
                  attach={vertical ? "e" : "n"}
                  size={13}
                >
                  {a.label}
                </Text>
              )}
            </g>
          );
        })}
        {graph.functions.map((f, i) => {
          const fn = fns[i];
          if (!fn) return null;
          const domain = f.domain ? ([Math.max(f.domain[0], graph.xMin), Math.min(f.domain[1], graph.xMax)] as [number, number]) : undefined;
          if (domain && !(domain[0] < domain[1])) return null;
          return <Plot.OfX key={i} y={fn} domain={domain} color={COLORS[i % COLORS.length]} style={f.dashed ? "dashed" : "solid"} />;
        })}
        {graph.functions.map((f, i) => {
          const fn = fns[i];
          if (!fn || !f.label) return null;
          // Label near the right end of the curve, at the first x (scanning left) where it is visible.
          const right = f.domain ? Math.min(f.domain[1], graph.xMax) : graph.xMax;
          const left = f.domain ? Math.max(f.domain[0], graph.xMin) : graph.xMin;
          for (let k = 1; k <= 10; k++) {
            const x = right - (right - left) * 0.1 * k;
            const y = fn(x);
            if (Number.isFinite(y) && y >= graph.yMin && y <= graph.yMax) {
              return (
                <Text key={`l${i}`} x={x} y={y} attach="n" color={COLORS[i % COLORS.length]}>
                  {f.label}
                </Text>
              );
            }
          }
          return null;
        })}
        {graph.points.map((p, i) => (
          <g key={`p${i}`}>
            <Point x={p.x} y={p.y} />
            {p.label && (
              <Text x={p.x} y={p.y} attach="ne" size={14}>
                {p.label}
              </Text>
            )}
          </g>
        ))}
      </Mafs>
    </div>
  );
}
