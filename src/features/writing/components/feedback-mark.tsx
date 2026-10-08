"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { FeedbackItem } from "../api/use-submission";
import type { EngErrorPayload, GoodPayload, MixedScriptPayload, ProblemPayload, WrongCharPayload } from "../lib/feedback-types";
import { MARK_CLASS } from "./marked-text";

/** One located feedback item in the side panel; clicking it highlights its span in the essay. */
export function FeedbackMarkCard({ item, active, onSelect }: { item: FeedbackItem; active: boolean; onSelect: (id: string) => void }) {
  const t = useTranslations("writing.feedback");
  const located = item.startPos != null;
  return (
    <button
      type="button"
      id={`fb-${item.id}`}
      onClick={() => onSelect(item.id)}
      className={cn(
        "hover:bg-muted/60 w-full rounded-md border p-2.5 text-left text-sm transition-colors",
        active && "border-ring ring-ring/40 ring-2",
      )}
    >
      <Body item={item} />
      {!located && <p className="text-muted-foreground mt-1 text-xs">{t("notLocated")}</p>}
    </button>
  );
}

function Body({ item }: { item: FeedbackItem }) {
  const t = useTranslations("writing.feedback");
  const tags = useTranslations("writing.tags");
  switch (item.kind) {
    case "wrong_char": {
      const p = item.payload as WrongCharPayload;
      return (
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-base">
            <span className={cn(MARK_CLASS.wrong_char, "px-1")}>{p.malformed ? `${p.wrong}✗` : p.wrong}</span>
            <ArrowRight className="text-muted-foreground size-3.5" />
            <span className="font-semibold">{p.correct}</span>
            {p.malformed && <span className="text-muted-foreground text-xs">{t("malformed")}</span>}
          </p>
          <p className="text-muted-foreground">{p.explanation}</p>
        </div>
      );
    }
    case "mixed_script": {
      const p = item.payload as MixedScriptPayload;
      return (
        <p className="flex items-center gap-2">
          <span className={cn(MARK_CLASS.mixed_script, "px-1 text-base")}>{p.char}</span>
          <ArrowRight className="text-muted-foreground size-3.5" />
          <span className="text-base font-semibold">{p.suggestion}</span>
        </p>
      );
    }
    case "problem_sentence": {
      const p = item.payload as ProblemPayload;
      return (
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs font-medium">{p.type}</p>
          <p className={cn(MARK_CLASS.problem_sentence, "w-fit")}>{p.quote}</p>
          <p>{p.issue}</p>
          <p className="text-mark-good flex gap-1">
            <Check className="mt-1 size-3.5 shrink-0" /> {p.rewrite}
          </p>
        </div>
      );
    }
    case "good_sentence": {
      const p = item.payload as GoodPayload;
      return (
        <div className="grid gap-1">
          <p className={cn(MARK_CLASS.good_sentence, "w-fit")}>{p.quote}</p>
          <p className="text-muted-foreground">{p.reason}</p>
        </div>
      );
    }
    case "eng_error": {
      const p = item.payload as EngErrorPayload;
      const key = p.tag.replace(/^en\./, "");
      return (
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs font-medium">{tags.has(key) ? tags(key as "sva") : p.tag}</p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-mark-wrong flex items-center gap-1 line-through decoration-1">
              <X className="size-3.5" /> {p.quote}
            </span>
            <ArrowRight className="text-muted-foreground size-3.5" />
            <span className="text-mark-good font-medium">{p.correction}</span>
          </p>
          <p className="text-muted-foreground">{p.explanation}</p>
        </div>
      );
    }
    default:
      return null;
  }
}
