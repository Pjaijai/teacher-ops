"use client";

import { CheckCircle2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DiagramView } from "@/components/diagrams/diagram-view";
import { KatexText } from "@/components/math/katex-text";
import { Badge } from "@/components/ui/badge";
import { useRateLocalQuestion } from "../api/use-bank-search";
import { Card, CardContent } from "@/components/ui/card";
import { isLocalMode } from "@/lib/app-mode";
import { Link } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { isWritingSubject, type Subject } from "@/lib/subjects";

type Item = {
  id: string;
  subject: Subject;
  kind: string;
  title: string;
  language: string;
  topicIds: string[];
  part: string | null;
  difficulty: number;
  extension: boolean;
  rating: { up: number; down: number };
  attempted: boolean;
  localRating?: 1 | -1 | 0;
  content: {
    stem: string;
    materials: string | null;
    figure: never;
    graph: never;
    physicsFigure?: never;
  };
};

export function QuestionPreviewCard({
  item,
  topicNames,
}: {
  item: Item;
  topicNames: Map<string, { en: string; zh: string }>;
}) {
  const t = useTranslations("bank");
  const tc = useTranslations("common");
  const locale = useLocale();
  const rate = useRateLocalQuestion();
  const href = isWritingSubject(item.subject)
    ? (`/writing/${item.id}` as const)
    : (`/practice/${item.id}` as const);
  const stem =
    item.content.stem.length > 280
      ? `${item.content.stem.slice(0, 280)}…`
      : item.content.stem;
  return (
    <Link href={href} className="block focus-visible:outline-none">
      <Card className="hover:border-primary/50 focus-visible:ring-ring transition-colors">
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{item.title}</h3>
            {item.attempted && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3" /> {t("attempted")}
              </Badge>
            )}
            {isLocalMode ? (
              <span className="text-muted-foreground ml-auto flex items-center gap-1">
                {([1, -1] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    title={r === 1 ? t("ratingUp") : t("ratingDown")}
                    aria-label={r === 1 ? t("ratingUp") : t("ratingDown")}
                    aria-pressed={item.localRating === r}
                    className={cn(
                      "hover:bg-muted rounded p-1.5",
                      item.localRating === r && "bg-muted text-foreground",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      rate.mutate({
                        id: item.id,
                        rating: item.localRating === r ? 0 : r,
                      });
                    }}
                  >
                    {r === 1 ? (
                      <ThumbsUp className="size-3.5" />
                    ) : (
                      <ThumbsDown className="size-3.5" />
                    )}
                  </button>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground ml-auto flex items-center gap-3 text-xs tabular-nums">
                <span className="flex items-center gap-1" title={t("ratingUp")}>
                  <ThumbsUp className="size-3.5" /> {item.rating.up}
                </span>
                <span
                  className="flex items-center gap-1"
                  title={t("ratingDown")}
                >
                  <ThumbsDown className="size-3.5" /> {item.rating.down}
                </span>
              </span>
            )}
          </div>
          <div className="max-h-40 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
            <KatexText>{stem}</KatexText>
          </div>
          {(item.content.figure || item.content.graph || item.content.physicsFigure) && (
            <DiagramView
              figure={item.content.figure}
              graph={item.content.graph}
              physicsFigure={item.content.physicsFigure}
              compact
            />
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{tc(`subjects.${item.subject}`)}</Badge>
            <Badge variant="outline">
              {t(`kinds.${item.kind}` as "kinds.mc")}
            </Badge>
            {!isWritingSubject(item.subject) && (
              <Badge variant="outline">
                {t("difficultyN", { n: item.difficulty })}
              </Badge>
            )}
            {item.extension && (
              <Badge variant="outline">{t("extension")}</Badge>
            )}
            {item.topicIds.map((id) => {
              const n = topicNames.get(id);
              return (
                <Badge key={id} variant="secondary">
                  {n ? (locale === "en" ? n.en : n.zh) : id}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
