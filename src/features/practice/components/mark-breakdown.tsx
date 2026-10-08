"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { KatexText } from "@/components/math/katex-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QuestionSolution } from "@/lib/schemas/question";
import { cn } from "@/lib/utils";
import type { AttemptDetail } from "../api/use-attempt";
import { DisputeDialog } from "./dispute-dialog";
import { MarkTypeBadge } from "./solution-view";

/** Score per part, then every mark: M/A, ✓/✗, what the scheme asked, and why it was awarded or lost. */
export function MarkBreakdown({ detail, solution }: { detail: AttemptDetail; solution: QuestionSolution | null }) {
  const t = useTranslations("practice.result");
  const parts = solution?.markingScheme.map((p) => p.part) ?? [...new Set(detail.marks.map((m) => m.part))];
  const disputed = new Set(detail.disputes.map((d) => `${d.part}#${d.markIndex ?? ""}`));
  const partName = (p: string) => (p ? t("partLabel", { part: p }) : t("wholeQuestion"));

  return (
    <div className="grid gap-4">
      {parts.map((part) => {
        const marks = detail.marks.filter((m) => m.part === part);
        const info = detail.parts.find((p) => p.part === part);
        const scheme = solution?.markingScheme.find((p) => p.part === part);
        const got = marks.filter((m) => m.awarded).length;
        return (
          <Card key={part || "whole"} className="print:break-inside-avoid">
            <CardHeader className="flex flex-row flex-wrap items-center gap-3">
              <CardTitle className="mr-auto text-base">{partName(part)}</CardTitle>
              <Badge variant={got === marks.length ? "default" : "secondary"} className="tabular-nums">
                {t("partScore", { got, max: marks.length })}
              </Badge>
              <DisputeDialog attemptId={detail.attempt.id} part={part} markIndex={null} label={partName(part)} disputed={disputed.has(`${part}#`)} />
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">{t("mark")}</TableHead>
                      <TableHead className="w-10" />
                      <TableHead>{t("reason")}</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marks.map((m) => {
                      const item = scheme?.items[m.markIndex];
                      return (
                        <TableRow key={m.markIndex} className={cn(!m.awarded && "bg-mark-wrong-bg/30")}>
                          <TableCell className="align-top">
                            <MarkTypeBadge type={m.type} />
                          </TableCell>
                          <TableCell className="align-top">
                            {m.awarded ? (
                              <Check className="text-mark-good size-5" aria-label={t("awarded")} />
                            ) : (
                              <X className="text-mark-wrong size-5" aria-label={t("notAwarded")} />
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-normal">
                            {item && (
                              <div className="text-muted-foreground mb-1 text-xs">
                                <KatexText>{item.text}</KatexText>
                              </div>
                            )}
                            <KatexText>{m.reason}</KatexText>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {m.studentLine !== null && (
                                <Badge variant="outline" className="text-[0.7rem]">
                                  {t("line", { n: m.studentLine + 1 })}
                                </Badge>
                              )}
                              {m.ecfFrom && (
                                <Badge variant="outline" className="text-[0.7rem]">
                                  {t("ecfFrom", { part: m.ecfFrom })}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <DisputeDialog
                              attemptId={detail.attempt.id}
                              part={part}
                              markIndex={m.markIndex}
                              label={`${partName(part)} · ${m.type}${m.markIndex + 1}`}
                              disputed={disputed.has(`${part}#${m.markIndex}`)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {info?.note && (
                <div className="bg-muted/40 rounded-md border p-3 text-sm">
                  <p className="mb-1 font-medium">{t("note")}</p>
                  <KatexText>{info.note}</KatexText>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
