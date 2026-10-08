"use client";

import { Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SubmissionView } from "../api/use-submission";
import { levelLabel } from "../lib/segments";

/** DSE estimate (beta): marks per criterion, total, estimated level and why. */
export function DseEstimateCard({ estimate, scores }: { estimate: NonNullable<SubmissionView["estimate"]>; scores: SubmissionView["scores"] }) {
  const t = useTranslations("writing.estimate");
  const common = useTranslations("common");
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-5" /> {t("title")} <Badge variant="outline">{common("beta")}</Badge>
        </CardTitle>
        <CardDescription>{t("disclaimer")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-muted-foreground text-xs">{t("level")}</p>
            <p className="text-4xl font-semibold tabular-nums">{levelLabel(estimate.level)}</p>
          </div>
          <div className="pb-1">
            <p className="text-muted-foreground text-xs">{t("total")}</p>
            <p className="text-lg font-medium tabular-nums">
              {estimate.totalMarks} / {estimate.maxMarks}
            </p>
          </div>
        </div>
        <p className="text-sm">{estimate.levelReason}</p>
        <div className="grid gap-3">
          {scores.map((s) => (
            <details key={s.criterion} className="group rounded-md border p-2.5">
              <summary className="flex cursor-pointer list-none items-center gap-3 text-sm">
                <span className="w-20 shrink-0 font-medium">{t.has(`criteria.${s.criterion}`) ? t(`criteria.${s.criterion}` as "criteria.content") : s.criterion}</span>
                <Progress value={(100 * s.marks) / (s.maxMarks || 1)} className="h-2 flex-1" />
                <span className="w-24 shrink-0 text-right tabular-nums">
                  {s.grade !== `${s.marks}/${s.maxMarks}` && <span className="text-muted-foreground mr-1 text-xs">{s.grade}</span>}
                  {s.marks}/{s.maxMarks}
                </span>
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">{s.reason}</p>
            </details>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
