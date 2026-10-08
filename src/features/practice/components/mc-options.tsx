"use client";

import { Check, Lightbulb, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { KatexText } from "@/components/math/katex-text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Option = { label: "A" | "B" | "C" | "D"; text: string };
export type McOutcome = { choice: string; correct: boolean; correctOption: string | null; misconception: string | null };

/** Four options; after answering, the key is green, a wrong choice red, and the misconception behind it shown. */
export function McOptions({
  options,
  outcome,
  disabled,
  onChoose,
}: {
  options: Option[];
  outcome: McOutcome | null;
  disabled?: boolean;
  onChoose: (label: Option["label"]) => void;
}) {
  const t = useTranslations("practice.mc");
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {options.map((o) => {
          const isKey = outcome?.correctOption === o.label;
          const isChoice = outcome?.choice === o.label;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={isChoice}
              disabled={disabled || outcome !== null}
              onClick={() => onChoose(o.label)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors print:break-inside-avoid",
                !outcome && "hover:border-primary hover:bg-primary/5",
                outcome && isKey && "border-mark-good bg-mark-good-bg",
                outcome && isChoice && !isKey && "border-mark-wrong bg-mark-wrong-bg",
                outcome && !isKey && !isChoice && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  outcome && isKey && "border-mark-good bg-mark-good text-white",
                  outcome && isChoice && !isKey && "border-mark-wrong bg-mark-wrong text-white",
                )}
              >
                {outcome && isKey ? <Check className="size-4" /> : outcome && isChoice ? <X className="size-4" /> : o.label}
              </span>
              <KatexText className="min-w-0 flex-1 pt-0.5">{o.text}</KatexText>
            </button>
          );
        })}
      </div>
      {outcome && (
        <Alert className={outcome.correct ? "border-mark-good" : "border-mark-wrong"}>
          {outcome.correct ? <Check className="text-mark-good size-4" /> : <Lightbulb className="text-mark-wrong size-4" />}
          <AlertTitle>{outcome.correct ? t("correct") : t("wrong", { key: outcome.correctOption ?? "?" })}</AlertTitle>
          {!outcome.correct && outcome.misconception && (
            <AlertDescription>
              <span className="font-medium">{t("why", { choice: outcome.choice })}</span>
              <KatexText>{outcome.misconception}</KatexText>
            </AlertDescription>
          )}
        </Alert>
      )}
    </div>
  );
}
