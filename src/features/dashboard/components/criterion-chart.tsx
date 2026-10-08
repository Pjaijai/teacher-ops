"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Dashboard } from "../api/use-dashboard";

/** Horizontal bars of the EWMA score (0–100%) per rubric criterion. */
export function CriterionChart({
  stats,
}: {
  stats: Dashboard["criterionStats"];
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const sorted = [...stats].sort((a, b) => a.ewma - b.ewma);
  return (
    <ul className="grid gap-3" aria-label={t("criteria")}>
      {sorted.map((c) => {
        const pct = Math.round(c.ewma * 100);
        const label = (locale === "en" ? c.nameEn : c.nameZh) ?? c.criterion;
        return (
          <li key={`${c.part}-${c.criterion}`} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>
                {label}{" "}
                <span className="text-muted-foreground text-xs">{c.part}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {pct}% · {t("times", { n: c.attempts })}
              </span>
            </div>
            <div
              className="bg-muted h-2.5 overflow-hidden rounded-full"
              role="img"
              aria-label={`${label} ${pct}%`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: `color-mix(in oklch, var(--mark-good) ${pct}%, var(--mark-wrong))`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
