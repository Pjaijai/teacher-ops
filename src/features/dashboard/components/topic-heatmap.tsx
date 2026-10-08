"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTopics } from "@/features/bank/api/use-bank-search";
import type { Dashboard } from "../api/use-dashboard";

/** One cell per topic: red-to-green by mastery, grey if not practised yet. */
export function TopicHeatmap({
  subject,
  mastery,
}: {
  subject: string;
  mastery: Dashboard["topicMastery"];
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const topics = useTopics(subject);
  const byId = new Map(mastery.map((m) => [m.topicId, m]));
  const all = (topics.data?.items ?? []).filter(
    (x) => x.kind === "unit" || x.kind === "subtopic",
  );
  const cells =
    all.length > 0
      ? all.map((x) => ({
          id: x.id,
          name: locale === "en" ? x.nameEn : x.nameZh,
          m: byId.get(x.id),
        }))
      : mastery.map((m) => ({
          id: m.topicId,
          name: (locale === "en" ? m.nameEn : m.nameZh) ?? m.topicId,
          m,
        }));
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1.5">
        {cells.map(({ id, name, m }) => {
          const pct = m ? Math.round(m.ewma * 100) : null;
          return (
            <div
              key={id}
              title={
                m
                  ? t("topicTooltip", { name, pct: pct!, n: m.attempts })
                  : t("topicUntouched", { name })
              }
              className="rounded-md border p-2 text-xs"
              style={{
                background: m
                  ? `color-mix(in oklch, var(--mark-good-bg) ${pct}%, var(--mark-wrong-bg))`
                  : undefined,
              }}
            >
              <div className="text-muted-foreground font-mono">{id}</div>
              <div className="line-clamp-2 min-h-8 leading-tight">{name}</div>
              <div className="mt-1 font-medium tabular-nums">
                {pct != null ? `${pct}%` : "—"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span>{t("legendLow")}</span>
        <span
          className="h-2 w-24 rounded-full"
          style={{
            background:
              "linear-gradient(to right, var(--mark-wrong-bg), var(--mark-good-bg))",
          }}
        />
        <span>{t("legendHigh")}</span>
      </div>
    </div>
  );
}
