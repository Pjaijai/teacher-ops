"use client";

import { DiagramView } from "@/components/diagrams/diagram-view";
import { KatexText } from "@/components/math/katex-text";
import type { LocalQuestion } from "@/features/local/local-db";
import { cn } from "@/lib/utils";

/** A paper question as printed in the exam: stem and figure only (no title, topic chips or hints). */
export function PaperQuestionBody({ question, compact = false, className }: { question: LocalQuestion; compact?: boolean; className?: string }) {
  const c = question.content;
  return (
    <div className={cn("grid gap-3", className)}>
      <KatexText className="text-[0.95rem] print:text-black">{c.stem}</KatexText>
      <DiagramView figure={c.figure} graph={c.graph} physicsFigure={c.physicsFigure ?? null} compact={compact} />
    </div>
  );
}
