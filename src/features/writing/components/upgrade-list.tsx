"use client";

import { ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeedbackItem } from "../api/use-submission";
import type { StructurePayload, VocabPayload } from "../lib/feedback-types";

/** Vocabulary and sentence-structure upgrades, each tied to the student's own sentence. */
export function UpgradeList({ items, activeId, onSelect }: { items: FeedbackItem[]; activeId: string | null; onSelect: (id: string) => void }) {
  const t = useTranslations("writing.feedback");
  const vocab = items.filter((i) => i.kind === "vocab_upgrade");
  const structure = items.filter((i) => i.kind === "structure_upgrade");
  const card = (item: FeedbackItem, children: React.ReactNode) => (
    <button
      key={item.id}
      id={`fb-${item.id}`}
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn("hover:bg-muted/60 w-full rounded-md border p-2.5 text-left text-sm transition-colors", activeId === item.id && "border-ring ring-ring/40 ring-2")}
    >
      {children}
      {item.startPos == null && <p className="text-muted-foreground mt-1 text-xs">{t("notLocated")}</p>}
    </button>
  );

  return (
    <div className="grid gap-4">
      {vocab.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("groups.vocab")}</p>
          {vocab.map((item) => {
            const p = item.payload as VocabPayload;
            return card(
              item,
              <div className="grid gap-1">
                <p className="text-muted-foreground line-clamp-2">「{p.quote}」</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{p.original}</span>
                  <span className="text-muted-foreground">→</span>
                  {p.upgrades.map((u) => (
                    <Badge key={u} variant="secondary">
                      {u}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">{p.note}</p>
              </div>,
            );
          })}
        </div>
      )}
      {structure.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("groups.structure")}</p>
          {structure.map((item) => {
            const p = item.payload as StructurePayload;
            return card(
              item,
              <div className="grid gap-1">
                <p className="text-muted-foreground">{p.quote}</p>
                <ArrowDown className="text-muted-foreground size-3.5" />
                <p className="font-medium">{p.rewrite}</p>
                <p className="text-muted-foreground text-xs">{p.note}</p>
              </div>,
            );
          })}
        </div>
      )}
    </div>
  );
}
