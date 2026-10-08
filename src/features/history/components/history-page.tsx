"use client";

import { Globe, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isLocalMode } from "@/lib/app-mode";
import { Link } from "@/lib/i18n/routing";
import { useHistory } from "../api/use-history";

export function HistoryPage() {
  const t = useTranslations("dashboard.history");
  const tc = useTranslations("common");
  const [type, setType] = useState<"writing" | "practice">("writing");
  const q = useHistory(type);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const statusLabel = (s: string) =>
    t.has(`status.${s}`) ? t(`status.${s}` as "status.graded") : s;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
        <TabsList>
          <TabsTrigger value="writing">{t("writing")}</TabsTrigger>
          <TabsTrigger value="practice">{t("practice")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : q.isError ? (
        <p className="text-destructive text-sm">{t("loadFailed")}</p>
      ) : items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-lg border border-dashed p-10 text-center text-sm">
          <p className="text-muted-foreground">
            {type === "writing" ? t("emptyWriting") : t("emptyPractice")}
          </p>
          <Button asChild>
            <Link href={type === "writing" ? "/writing" : "/practice"}>
              {type === "writing" ? t("startWriting") : t("startPractice")}
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={
                  (it.type === "writing"
                    ? `/writing/submissions/${it.id}`
                    : `/practice/attempts/${it.id}`) as never
                }
                className="hover:bg-muted/50 flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{it.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {tc(`subjects.${it.subject as "math_cp"}`)} ·{" "}
                    {new Date(it.createdAt).toLocaleString()}
                  </span>
                </span>
                {it.level != null && (
                  <Badge variant="secondary">
                    {t("level", { level: it.level })}
                  </Badge>
                )}
                {it.score != null && it.maxScore != null && (
                  <span className="tabular-nums">
                    {it.score}/{it.maxScore}
                  </span>
                )}
                <Badge variant="outline">{statusLabel(it.status)}</Badge>
                {!isLocalMode && (
                  <Badge
                    variant={
                      it.visibility === "public" ? "default" : "secondary"
                    }
                    className="gap-1"
                  >
                    {it.visibility === "public" ? (
                      <Globe className="size-3" />
                    ) : (
                      <Lock className="size-3" />
                    )}
                    {t(it.visibility ?? "private")}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => q.fetchNextPage()}
          disabled={q.isFetchingNextPage}
        >
          {t("more")}
        </Button>
      )}
    </div>
  );
}
