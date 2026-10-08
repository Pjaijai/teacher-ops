"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LevelSampleView } from "../api/use-submission";
import { levelLabel, type TextMark } from "../lib/segments";
import { MarkedText } from "./marked-text";

function locate(text: string, quote: string, used: Set<number>) {
  const q = quote.trim();
  for (let from = 0; q; ) {
    const s = text.indexOf(q, from);
    if (s < 0) break;
    if (!used.has(s)) {
      used.add(s);
      return { start: s, end: s + q.length };
    }
    from = s + 1;
  }
  return null;
}

/** Side by side: the student's essay and the upgraded sample, each change highlighted with its note. */
export function SampleCompare({ original, sample }: { original: string; sample: LevelSampleView }) {
  const t = useTranslations("writing.sample");
  const [active, setActive] = useState<string | null>(null);

  const { left, right } = useMemo(() => {
    const usedL = new Set<number>();
    const usedR = new Set<number>();
    const left: TextMark[] = [];
    const right: TextMark[] = [];
    sample.changes.forEach((c, i) => {
      const a = locate(original, c.original, usedL);
      const b = locate(sample.text, c.sample, usedR);
      if (a) left.push({ id: `c${i}`, ...a, kind: "change" });
      if (b) right.push({ id: `c${i}`, ...b, kind: "change" });
    });
    return { left, right };
  }, [original, sample]);

  const noteFor = (m: TextMark) => sample.changes[Number(m.id.slice(1))]?.note;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("title")} <Badge>{t("target", { level: levelLabel(sample.targetLevel) })}</Badge>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{t("yours")}</p>
            <div className="max-h-[60vh] overflow-y-auto rounded-md border p-3">
              <MarkedText text={original} marks={left} activeId={active} onSelect={setActive} titleFor={noteFor} className="text-base" />
            </div>
          </div>
          <div className="grid content-start gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{t("upgraded", { level: levelLabel(sample.targetLevel) })}</p>
            <div className="max-h-[60vh] overflow-y-auto rounded-md border p-3">
              <MarkedText text={sample.text} marks={right} activeId={active} onSelect={setActive} titleFor={noteFor} className="text-base" />
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("changes", { n: sample.changes.length })}</p>
          <ol className="grid gap-2">
            {sample.changes.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setActive(`c${i}`)}
                  className={cn("hover:bg-muted/60 grid w-full gap-1 rounded-md border p-2.5 text-left text-sm", active === `c${i}` && "border-ring ring-ring/40 ring-2")}
                >
                  <span className="text-muted-foreground line-through decoration-1">{c.original}</span>
                  <span className="font-medium">{c.sample}</span>
                  <span className="text-muted-foreground text-xs">{c.note}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
