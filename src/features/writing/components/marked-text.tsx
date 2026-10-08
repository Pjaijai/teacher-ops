"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { segmentText, type MarkKind, type TextMark } from "../lib/segments";

/** Tailwind classes per mark (colour tokens from globals.css). */
export const MARK_CLASS: Record<MarkKind, string> = {
  wrong_char: "text-mark-wrong bg-mark-wrong-bg font-semibold rounded-sm",
  mixed_script: "text-mark-script bg-mark-script-bg rounded-sm",
  eng_error: "bg-mark-wrong-bg underline decoration-mark-wrong decoration-wavy decoration-1 underline-offset-4",
  problem_sentence: "bg-mark-problem-bg underline decoration-mark-problem decoration-2 underline-offset-4",
  good_sentence: "bg-mark-good-bg",
  vocab_upgrade: "underline decoration-primary decoration-dotted decoration-2 underline-offset-4",
  structure_upgrade: "underline decoration-primary decoration-dashed underline-offset-4",
  strength: "",
  edit: "underline decoration-sky-500 decoration-double underline-offset-4",
  unsure: "bg-mark-unsure-bg rounded-sm",
  insertion: "underline decoration-mark-good decoration-2 underline-offset-4",
  change: "bg-mark-good-bg",
};

/**
 * The essay with feedback drawn on it. Clicking a mark selects its feedback item; the active item's
 * span gets an outline and scrolls into view.
 */
export function MarkedText({
  text,
  marks,
  activeId,
  onSelect,
  className,
  titleFor,
}: {
  text: string;
  marks: TextMark[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  titleFor?: (mark: TextMark) => string | undefined;
}) {
  const root = useRef<HTMLDivElement>(null);
  const segments = segmentText(text, marks);

  useEffect(() => {
    if (!activeId) return;
    root.current?.querySelector(`[data-mark-ids~="${CSS.escape(activeId)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeId]);

  return (
    <div ref={root} className={cn("text-[1.05rem] leading-[2.1] break-words whitespace-pre-wrap", className)}>
      {segments.map((seg) => {
        if (seg.marks.length === 0) return <span key={seg.start}>{seg.text}</span>;
        const top = seg.marks[0];
        const active = activeId != null && seg.marks.some((m) => m.id === activeId);
        return (
          <span
            key={seg.start}
            data-mark-ids={seg.marks.map((m) => m.id).join(" ")}
            title={titleFor?.(top)}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={onSelect ? () => onSelect(top.id) : undefined}
            onKeyDown={onSelect ? (e) => (e.key === "Enter" || e.key === " ") && onSelect(top.id) : undefined}
            className={cn(
              MARK_CLASS[top.kind],
              onSelect && "cursor-pointer",
              active && "ring-ring ring-2 ring-offset-1",
            )}
          >
            {seg.text}
          </span>
        );
      })}
    </div>
  );
}
