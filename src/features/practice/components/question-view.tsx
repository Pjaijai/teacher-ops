"use client";

import { Lock, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { DiagramView } from "@/components/diagrams/diagram-view";
import { KatexText } from "@/components/math/katex-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuestionPublic } from "@/lib/schemas/question";
import { cn } from "@/lib/utils";

/** The question as printed: title, topic chips, stem (KaTeX) and figure. Print-friendly. */
export function QuestionView({ question, compact = false, className }: { question: QuestionPublic; compact?: boolean; className?: string }) {
  const t = useTranslations("practice.question");
  const options = useTranslations("practice.options");
  return (
    <article className={cn("question-view grid gap-3 print:break-inside-avoid", className)}>
      <header className="flex flex-wrap items-start gap-2">
        <h2 className={cn("mr-auto font-semibold", compact ? "text-base" : "text-lg")}>{question.title}</h2>
        {!compact && (
          <Button variant="ghost" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4" /> {t("print")}
          </Button>
        )}
      </header>
      <div className="flex flex-wrap gap-1.5 print:hidden">
        <Badge variant="secondary">{options(`kinds.${question.kind}`)}</Badge>
        {question.topicIds.map((id) => (
          <Badge key={id} variant="outline" className="font-mono">
            {id}
          </Badge>
        ))}
        <Badge variant="outline">{t("difficulty", { level: question.difficulty })}</Badge>
        {question.isPrivate && (
          <Badge variant="outline" className="gap-1">
            <Lock className="size-3" /> {t("private")}
          </Badge>
        )}
      </div>
      <div className={cn("text-[0.95rem] print:text-black", !compact && "md:text-base")}>
        <KatexText>{question.content.stem}</KatexText>
      </div>
      <DiagramView figure={question.content.figure} graph={question.content.graph} physicsFigure={question.content.physicsFigure ?? null} compact={compact} />
    </article>
  );
}
