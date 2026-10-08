"use client";

import { ChevronRight, FileText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/i18n/routing";
import { useSubmissions } from "../api/use-submission";
import { levelLabel } from "../lib/segments";

export type SubmissionStatus = "draft" | "transcribing" | "transcribe_failed" | "review" | "grading" | "graded";

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("writing.status");
  const variant = status === "graded" ? "default" : status === "transcribe_failed" ? "destructive" : "secondary";
  return <Badge variant={variant}>{t.has(status) ? t(status as SubmissionStatus) : status}</Badge>;
}

/** My recent writing (all questions, or one question). */
export function RecentSubmissions({ questionId, title }: { questionId?: string; title?: string }) {
  const t = useTranslations("writing");
  const common = useTranslations("common");
  const format = useFormatter();
  const list = useSubmissions(questionId);
  const items = list.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? t("recent.title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1 px-2 sm:px-4">
        {list.isLoading && <Skeleton className="h-14 w-full" />}
        {!list.isLoading && items.length === 0 && <p className="text-muted-foreground px-2 text-sm">{t("recent.empty")}</p>}
        {items.map((s) => (
          <Link key={s.id} href={`/writing/submissions/${s.id}`} className="hover:bg-muted/60 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors">
            <FileText className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.title}</p>
              <p className="text-muted-foreground text-xs">
                {common(`subjects.${s.subject}`)} · {s.part ?? ""} · {format.dateTime(new Date(s.createdAt), { dateStyle: "medium" })}
                {s.parentSubmissionId ? ` · ${t("recent.revision")}` : ""}
              </p>
            </div>
            {s.level != null && <Badge variant="outline">{t("recent.level", { level: levelLabel(s.level) })}</Badge>}
            <StatusBadge status={s.status} />
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
