"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/i18n/routing";
import type { Dashboard } from "../api/use-dashboard";

export function RecentActivity({ items }: { items: Dashboard["recent"] }) {
  const t = useTranslations("dashboard");
  if (!items.length)
    return <p className="text-muted-foreground text-sm">{t("noRecent")}</p>;
  return (
    <ul className="divide-y">
      {items.map((r) => (
        <li key={`${r.type}-${r.id}`}>
          <Link
            href={r.href as never}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-2 rounded px-1 py-2 text-sm"
          >
            <Badge variant="outline">{t(`types.${r.type}`)}</Badge>
            <span className="min-w-0 flex-1 truncate">{r.title}</span>
            {r.score != null && r.maxScore != null && (
              <span className="tabular-nums">
                {r.score}/{r.maxScore}
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
