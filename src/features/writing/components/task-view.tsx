"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { KatexText } from "@/components/math/katex-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuestionPublic } from "@/lib/schemas/question";
import { cn } from "@/lib/utils";

/** The writing task: title, part / genre / length chips, the task text and (甲部 / Part A) materials. */
export function TaskView({ question, compact = false }: { question: QuestionPublic; compact?: boolean }) {
  const t = useTranslations("writing");
  const common = useTranslations("common");
  const w = question.content.writing;
  const unit = question.subject === "chi_writing" ? "chars" : "words";
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{common(`subjects.${question.subject}`)}</Badge>
          {(w?.part ?? question.part) && <Badge variant="outline">{w?.part ?? question.part}</Badge>}
          {w?.genre && <Badge variant="outline">{w.genre}</Badge>}
          {w?.textType && <Badge variant="outline">{w.textType}</Badge>}
          {w?.wordLimit && <Badge variant="outline">{t(`task.limit.${unit}`, { n: w.wordLimit })}</Badge>}
          {question.isPrivate && (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" /> {t("task.private")}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl leading-snug">{question.title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("grid gap-4", compact && "max-h-72 overflow-y-auto")}>
        <KatexText>{question.content.stem}</KatexText>
        {question.content.materials && (
          <div className="bg-muted/50 rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">{t("task.materials")}</p>
            <KatexText className="text-sm">{question.content.materials}</KatexText>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
