"use client";

import { AlertCircle, Check, Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LocalPaper, LocalQuestion } from "@/features/local/local-db";
import { cn } from "@/lib/utils";
import { continueToReview, fillPaper, isSlotBusy, slotKey } from "../api/local-papers";

/** Generation progress, slot by slot. Opening this screen (e.g. after a reload) resumes the empty slots. */
export function PaperGenerating({ paper }: { paper: LocalPaper; questions: Map<string, LocalQuestion> }) {
  const t = useTranslations("practice.paper");
  useEffect(() => {
    void fillPaper(paper.id);
  }, [paper.id]);

  const done = paper.slots.filter((s) => s.questionId).length;
  const failed = paper.slots.filter((s) => !s.questionId && s.error);
  const running = paper.slots.some((s) => isSlotBusy(paper.id, slotKey(s)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("generating.title", { done, total: paper.slots.length })}</CardTitle>
        <CardDescription>{t("generating.hint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Progress value={(100 * done) / Math.max(1, paper.slots.length)} />
        {(["A", "B"] as const).map((section) => {
          const slots = paper.slots.filter((s) => s.section === section);
          if (!slots.length) return null;
          return (
            <section key={section} className="grid gap-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t(`section${section}`)}</h3>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s) => {
                  const key = slotKey(s);
                  const busy = isSlotBusy(paper.id, key);
                  return (
                    <span
                      key={key}
                      title={s.error ?? s.topicIds.join(", ")}
                      className={cn(
                        "flex h-8 min-w-8 items-center justify-center gap-1 rounded border px-1.5 text-xs",
                        s.questionId && "border-mark-good bg-mark-good-bg",
                        s.error && !s.questionId && "border-destructive text-destructive",
                      )}
                    >
                      {s.questionId ? <Check className="size-3" /> : busy ? <Loader2 className="size-3 animate-spin" /> : s.error ? <AlertCircle className="size-3" /> : null}
                      {s.n}
                    </span>
                  );
                })}
              </div>
            </section>
          );
        })}
        {failed.length > 0 && !running && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-destructive text-sm">{t("generating.failed", { count: failed.length })}</span>
            <Button size="sm" variant="outline" onClick={() => void fillPaper(paper.id, { retryFailed: true })}>
              <RotateCcw className="size-4" /> {t("generating.retry")}
            </Button>
            {done > 0 && (
              <Button size="sm" variant="ghost" onClick={() => void continueToReview(paper.id)}>
                {t("generating.continue")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
