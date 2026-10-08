"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { KatexText } from "@/components/math/katex-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getImage } from "@/features/local/local-db";
import { fileUrl } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { cn } from "@/lib/utils";

export type Line = { latex: string };

/** Render one LaTeX line (no $ in storage). Lines that are only \text{…} still render. */
export function LatexLine({ latex, className }: { latex: string; className?: string }) {
  if (!latex.trim()) return <span className="text-muted-foreground">—</span>;
  return <KatexText className={cn("overflow-x-auto [&_p]:my-0", className)}>{`$${latex}$`}</KatexText>;
}

/**
 * Review the AI's reading line by line: rendered KaTeX beside the editable raw LaTeX.
 * Lines that differ from the AI's reading are tagged "edited" (the server tracks the changes).
 */
export function LatexTranscriptReview({
  lines,
  aiLines,
  onChange,
  pages = [],
}: {
  lines: Line[];
  aiLines: Line[] | null;
  onChange: (lines: Line[]) => void;
  pages?: { pageNo: number; key: string }[];
}) {
  const t = useTranslations("practice.transcript");
  const set = (i: number, latex: string) => onChange(lines.map((l, j) => (j === i ? { latex } : l)));
  const insert = (i: number) => onChange([...lines.slice(0, i + 1), { latex: "" }, ...lines.slice(i + 1)]);
  const remove = (i: number) => onChange(lines.filter((_, j) => j !== i));

  return (
    <div className={cn("grid gap-4", pages.length > 0 && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
      {pages.length > 0 && (
        <div className="grid content-start gap-2 lg:sticky lg:top-16 lg:max-h-[calc(100svh-5rem)] lg:overflow-y-auto">
          {pages.map((p) => (
            <PageImage key={p.key} imageKey={p.key} alt={t("page", { n: p.pageNo })} />
          ))}
        </div>
      )}
      <div className="grid content-start gap-2">
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
        {lines.map((l, i) => {
          const edited = aiLines !== null && (aiLines[i]?.latex ?? "").trim() !== l.latex.trim();
          return (
            <div key={i} className={cn("group grid gap-1.5 rounded-md border p-2", edited && "border-mark-problem bg-mark-problem-bg/40")}>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-6 text-right font-mono text-xs">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <LatexLine latex={l.latex} />
                </div>
                {edited && <Badge variant="outline">{t("edited")}</Badge>}
                <Button type="button" size="icon-xs" variant="ghost" onClick={() => insert(i)} aria-label={t("insertBelow")}>
                  <Plus />
                </Button>
                <Button type="button" size="icon-xs" variant="ghost" onClick={() => remove(i)} aria-label={t("remove")}>
                  <Trash2 />
                </Button>
              </div>
              <Textarea
                value={l.latex}
                onChange={(e) => set(i, e.target.value)}
                rows={1}
                spellCheck={false}
                className="min-h-8 resize-y font-mono text-xs"
                aria-label={t("lineLabel", { n: i + 1 })}
              />
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => onChange([...lines, { latex: "" }])}>
          <Plus className="size-4" /> {t("addLine")}
        </Button>
      </div>
    </div>
  );
}

/** One answer page: an upload served by the API (cloud) or a photo kept in this browser (local; `imageKey` is the image id). */
function PageImage({ imageKey, alt }: { imageKey: string; alt: string }) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isLocalMode) return;
    let url: string | null = null;
    let cancelled = false;
    void getImage(imageKey).then((blob) => {
      if (!blob || cancelled) return;
      url = URL.createObjectURL(blob);
      setLocalUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageKey]);

  const src = isLocalMode ? localUrl : fileUrl(imageKey);
  if (!src) return <div className="bg-muted aspect-[3/4] w-full animate-pulse rounded-md border" />;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element -- private upload (API) or a local object URL */}
      <img src={src} alt={alt} className="w-full rounded-md border" />
    </a>
  );
}
