"use client";

import { isLocalMode } from "@/lib/app-mode";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiClientError } from "@/lib/api-client";
import { useCommunityAnswers, type AnswerSort } from "../api/use-community-answers";
import { AnswerCard } from "./answer-card";

/** Public answers on a question. Locked (403) until the viewer has answered it themselves. */
export function CommunityAnswers({ questionId }: { questionId: string }) {
  if (isLocalMode) return null; // community needs accounts and a database (cloud mode)
  const t = useTranslations("community");
  const [sort, setSort] = useState<AnswerSort>("top");
  const q = useCommunityAnswers(questionId, sort);

  if (q.error instanceof ApiClientError && q.error.status === 403) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed p-5 text-sm">
        <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">{t("lockedTitle")}</p>
          <p className="text-muted-foreground">{t("lockedBody")}</p>
        </div>
      </div>
    );
  }
  if (q.isLoading) return <Skeleton className="h-28 w-full" />;
  if (q.isError) return <p className="text-destructive text-sm">{t("loadFailed")}</p>;

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{t("title")}</h3>
        <Tabs value={sort} onValueChange={(v) => setSort(v as AnswerSort)}>
          <TabsList>
            <TabsTrigger value="top">{t("sortTop")}</TabsTrigger>
            <TabsTrigger value="new">{t("sortNew")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">{t("empty")}</p>
      ) : (
        items.map((a) => <AnswerCard key={a.id} answer={a} questionId={questionId} sort={sort} />)
      )}
      {q.hasNextPage && (
        <Button variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
          {t("more")}
        </Button>
      )}
    </div>
  );
}
