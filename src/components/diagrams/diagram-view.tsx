"use client";

import dynamic from "next/dynamic";
import type { Diagram, Graph } from "@/lib/schemas/diagram";
import type { PhysicsFigure } from "@/lib/schemas/physics-figure";
import { CircuitDiagram } from "./circuit-diagram";
import { FreeBodyDiagram } from "./free-body-diagram";
import { GeometryDiagram } from "./geometry-diagram";
import { RayDiagram } from "./ray-diagram";
import { WaveGraph } from "./wave-graph";

const MafsGraph = dynamic(() => import("@/components/math/mafs-graph").then((m) => m.MafsGraph), { ssr: false });

/** A physics figure (circuit, ray, free-body or wave) drawn by its renderer. */
export function PhysicsFigureView({ figure, compact = false }: { figure: PhysicsFigure; compact?: boolean }) {
  switch (figure.kind) {
    case "circuit":
      return <CircuitDiagram figure={figure} maxWidth={compact ? 260 : 380} maxHeight={compact ? 190 : 280} />;
    case "ray":
      return <RayDiagram figure={figure} maxWidth={compact ? 280 : 440} maxHeight={compact ? 180 : 280} />;
    case "free_body":
      return <FreeBodyDiagram figure={figure} size={compact ? 220 : 300} />;
    case "wave":
      return <WaveGraph figure={figure} maxWidth={compact ? 280 : 420} plotHeight={compact ? 120 : 170} />;
    default:
      return null;
  }
}

/** A question's figure, physics figure and/or function graph. */
export function DiagramView({
  figure,
  graph,
  physicsFigure = null,
  compact = false,
}: {
  figure: Diagram | null;
  graph: Graph | null;
  physicsFigure?: PhysicsFigure | null;
  compact?: boolean;
}) {
  if (!figure && !graph && !physicsFigure) return null;
  return (
    <div className="flex flex-wrap items-start gap-4">
      {figure && <GeometryDiagram diagram={figure} maxWidth={compact ? 240 : 340} maxHeight={compact ? 180 : 260} />}
      {physicsFigure && <PhysicsFigureView figure={physicsFigure} compact={compact} />}
      {graph && (
        <div className={compact ? "w-60" : "w-full max-w-md"}>
          <MafsGraph graph={graph} height={compact ? 180 : 300} />
        </div>
      )}
    </div>
  );
}
