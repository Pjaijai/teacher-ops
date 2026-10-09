"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/i18n/routing";
import { usePaper } from "../api/use-paper";
import { PaperChat } from "./paper-chat";
import { PaperGenerating } from "./paper-generating";
import { PaperResults } from "./paper-results";
import { PaperReview } from "./paper-review";
import { PaperSitting } from "./paper-sitting";

/** /practice/papers/[paperId]: one screen per stage of the paper. */
export function PaperPage({ paperId }: { paperId: string }) {
  const t = useTranslations("practice.paper");
  const data = usePaper(paperId);

  if (data.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data.data) return <p className="text-destructive">{data.error instanceof Error ? data.error.message : t("notFound")}</p>;
  const { paper, questions } = data.data;

  return (
    <div className="grid gap-6">
      {paper.status !== "sitting" && (
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Link href="/practice" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="size-4" /> {t("back")}
          </Link>
          <h1 className="mr-auto text-xl font-semibold">{t(`presets.${paper.spec.preset}`)}</h1>
          <Badge variant="outline">{t(`status.${paper.status}`)}</Badge>
        </div>
      )}
      {paper.status === "planning" && <PaperChat paper={paper} />}
      {paper.status === "generating" && <PaperGenerating paper={paper} questions={questions} />}
      {paper.status === "review" && <PaperReview paper={paper} questions={questions} />}
      {paper.status === "sitting" && <PaperSitting paper={paper} questions={questions} />}
      {paper.status === "submitted" && <PaperResults paperId={paper.id} />}
    </div>
  );
}
