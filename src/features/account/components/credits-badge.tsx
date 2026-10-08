"use client";

import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isLocalMode } from "@/lib/app-mode";
import { useCredits } from "../api/use-me";

export function CreditsBadge() {
  const t = useTranslations("common.credits");
  const credits = useCredits();
  if (!credits) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={credits.balance < 10 ? "destructive" : "secondary"} className="gap-1 tabular-nums">
          <Coins className="size-3.5" />
          {t("label", { balance: credits.balance })}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t("tooltip", { balance: credits.balance, quota: credits.quota })}</TooltipContent>
    </Tooltip>
  );
}

/** Small "N credits" label for buttons that start AI work. */
export function CreditCost({ cost }: { cost: number }) {
  const t = useTranslations("common.credits");
  if (isLocalMode) return null; // no credits in local mode
  return <span className="text-muted-foreground ml-1 text-xs font-normal">· {t("cost", { cost })}</span>;
}
