"use client";

import { Check, Printer, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { skipSlot, slotKey } from "../api/local-papers";
import { usePaperResults } from "../api/use-paper";

const STRAND_NAMES: Record<string, string> = { I: "heat", II: "force", III: "waves", IV: "electricity", V: "nuclear" };

/** After hand-in: MC marked by code; 1B marked from photos one question at a time; score, strands and a rough level. */
export function PaperResults({ paperId }: { paperId: string }) {
  const t = useTranslations("practice.paper");
  const r = usePaperResults(paperId, true);
  if (r.isLoading || !r.data) return <Skeleton className="h-96 w-full" />;
  const { paper, rows, summary } = r.data;
  const a = rows.filter((x) => x.slot.section === "A");
  const b = rows.filter((x) => x.slot.section === "B");
  const answerLink = (questionId: string) => `/practice/${questionId}?paper=${paper.id}`;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("results.title")}</CardTitle>
          <CardDescription>{t("results.levelNote")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex flex-wrap items-end gap-8">
            <div>
              <div className="text-muted-foreground text-xs">{t("results.total")}</div>
              <div className="text-3xl font-semibold tabular-nums">
                {summary.score} / {summary.max}
                <span className="text-muted-foreground ml-2 text-base">({Math.round(summary.pct)}%)</span>
              </div>
            </div>
            {summary.level && (
              <div>
                <div className="text-muted-foreground text-xs">{t("results.level")}</div>
                <div className="text-3xl font-semibold">{t("results.levelValue", { level: summary.level })}</div>
              </div>
            )}
            {a.length > 0 && (
              <div>
                <div className="text-muted-foreground text-xs">{t("sectionA")}</div>
                <div className="text-xl font-semibold tabular-nums">
                  {summary.A.score} / {summary.A.max}
                </div>
              </div>
            )}
            {b.length > 0 && (
              <div>
                <div className="text-muted-foreground text-xs">{t("sectionB")}</div>
                <div className="text-xl font-semibold tabular-nums">
                  {summary.B.score} / {summary.B.max}
                </div>
                <div className="text-muted-foreground text-xs">{t("results.markedOf", { marked: summary.B.marked, total: b.length })}</div>
              </div>
            )}
          </div>
          {summary.unmarked > 0 && <p className="text-sm text-amber-700">{t("results.unmarked", { count: summary.unmarked })}</p>}
          <div className="grid gap-2">
            {summary.strands.map((s) => (
              <div key={s.strand} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-sm">
                <span>{t(`strands.${STRAND_NAMES[s.strand]}`)}</span>
                <Progress value={(100 * s.score) / s.max} />
                <span className="text-right tabular-nums">
                  {s.score}/{s.max}
                </span>
              </div>
            ))}
          </div>
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/practice/papers/${paper.id}/print?scheme=1`}>
                <Printer className="size-4" /> {t("printScheme")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {b.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("results.bTitle")}</CardTitle>
            <CardDescription>{t("results.bHint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {b.map((row) => {
              const key = slotKey(row.slot);
              const q = row.question;
              return (
                <div key={key} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="w-8 font-mono font-semibold">{key}</span>
                  <span className="min-w-0 flex-1 truncate">{q?.title}</span>
                  {row.status === "marked" && (
                    <Badge variant="secondary" className="tabular-nums">
                      {row.score} / {row.maxScore}
                    </Badge>
                  )}
                  {row.status === "skipped" && <Badge variant="outline">{t("results.skipped")}</Badge>}
                  {row.status !== "marked" && row.status !== "skipped" && row.status !== "none" && <Badge variant="outline">{t("results.inProgress")}</Badge>}
                  {q && row.status !== "skipped" && (
                    <Button size="sm" variant={row.status === "marked" ? "ghost" : "default"} asChild>
                      <Link href={row.status === "marked" && row.attemptId ? `/practice/attempts/${row.attemptId}` : answerLink(q.id)}>
                        {row.status === "marked" ? (
                          t("results.viewMarking")
                        ) : (
                          <>
                            <Upload className="size-4" /> {t("results.uploadMark")}
                          </>
                        )}
                      </Link>
                    </Button>
                  )}
                  {row.status !== "marked" && (
                    <Button size="sm" variant="ghost" onClick={() => void skipSlot(paper.id, key, row.status !== "skipped")}>
                      {row.status === "skipped" ? t("results.unskip") : t("results.skip")}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {a.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("results.aTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1.5">
              {a.map((row) => {
                const ok = row.score === 1;
                return (
                  <Link
                    key={slotKey(row.slot)}
                    href={row.question ? `/practice/${row.question.id}?answer=1&paper=${paper.id}` : "#"}
                    className={cn(
                      "flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs hover:underline",
                      ok ? "border-mark-good bg-mark-good-bg" : "border-mark-wrong bg-mark-wrong-bg",
                    )}
                  >
                    {ok ? <Check className="size-3" /> : <X className="size-3" />}
                    <span className="font-semibold">{row.slot.n}</span>
                    <span className="text-muted-foreground">
                      {row.slot.mcChoice ?? "–"}
                      {!ok && row.question?.content.correctOption ? ` → ${row.question.content.correctOption}` : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
