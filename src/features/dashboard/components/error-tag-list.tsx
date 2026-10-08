"use client";

import { useTranslations } from "next-intl";
import type { Dashboard } from "../api/use-dashboard";

/** Most frequent recent mistakes. Recent ones weigh more (older counts decay). */
export function ErrorTagList({ tags }: { tags: Dashboard["errorTags"] }) {
  const t = useTranslations("dashboard");
  const max = Math.max(...tags.map((x) => x.weighted), 1);
  return (
    <ul className="grid gap-2">
      {tags.map((x) => (
        <li key={x.tag} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-mono text-xs break-all">{x.tag}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {t("tagTotal", { n: x.total })}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-mark-problem h-full rounded-full"
              style={{ width: `${(x.weighted / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
