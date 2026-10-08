"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/i18n/routing";
import { useAttempts, type AttemptListItem } from "../api/use-attempt";

/** The student's latest practice attempts, linking to results (or back to the question if unfinished). */
export function RecentAttempts() {
  const t = useTranslations("practice.recent");
  const list = useAttempts(undefined, 10);
  const items = list.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {items.map((a) => (
              <li key={a.id}>
                <Link href={a.status === "marked" ? `/practice/attempts/${a.id}` : `/practice/${a.questionId}`} className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded px-2 py-2.5">
                  <Outcome a={a} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(a.createdAt).toLocaleDateString()} · {a.topicIds.join(", ")}
                    </span>
                  </span>
                  {a.status !== "marked" && <Badge variant="outline">{t(`status.${a.status}`)}</Badge>}
                  <ChevronRight className="text-muted-foreground size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Outcome({ a }: { a: AttemptListItem }) {
  if (a.status !== "marked") return <span className="size-9 shrink-0" />;
  if (a.kind === "mc")
    return (
      <span className="flex size-9 shrink-0 items-center justify-center">
        {a.mcCorrect ? <Check className="text-mark-good size-5" /> : <X className="text-mark-wrong size-5" />}
      </span>
    );
  return (
    <span className="bg-muted flex h-9 min-w-9 shrink-0 items-center justify-center rounded px-1 text-xs font-semibold tabular-nums">
      {a.score ?? 0}/{a.maxScore ?? 0}
    </span>
  );
}
