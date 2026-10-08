"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VoteButtons({
  up,
  down,
  myVote,
  disabled,
  onVote,
}: {
  up: number;
  down: number;
  myVote: 1 | -1 | 0;
  disabled?: boolean;
  onVote: (value: 1 | -1 | 0) => void;
}) {
  const t = useTranslations("community");
  return (
    <div className="flex flex-col items-center gap-0.5" role="group" aria-label={t("votes")}>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-pressed={myVote === 1}
        aria-label={t("upvote")}
        title={disabled ? t("cantVoteOwn") : t("upvote")}
        onClick={() => onVote(myVote === 1 ? 0 : 1)}
        className={cn(myVote === 1 && "text-mark-good bg-mark-good-bg")}
      >
        <ChevronUp />
      </Button>
      <span className="text-sm font-medium tabular-nums" aria-live="polite">
        {up - down}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-pressed={myVote === -1}
        aria-label={t("downvote")}
        title={disabled ? t("cantVoteOwn") : t("downvote")}
        onClick={() => onVote(myVote === -1 ? 0 : -1)}
        className={cn(myVote === -1 && "text-mark-wrong bg-mark-wrong-bg")}
      >
        <ChevronDown />
      </Button>
    </div>
  );
}
