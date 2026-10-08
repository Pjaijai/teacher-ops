"use client";

import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { isLocalMode } from "@/lib/app-mode";
import type { PublicJob } from "@/server/api/routes/jobs";

/** Step list for a running job. Step names are keys in common.job.steps. */
export function JobProgress({ job }: { job: PublicJob | null }) {
  const t = useTranslations("common.job");
  if (!job) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> {t("running")}
      </p>
    );
  }
  return (
    <div className="grid gap-1.5 text-sm">
      {job.progress.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          {p.status === "running" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : p.status === "done" ? (
            <Check className="text-mark-good size-4" />
          ) : (
            <X className="text-destructive size-4" />
          )}
          {t.has(`steps.${p.step}`) ? t(`steps.${p.step}` as "steps.load") : p.step}
        </div>
      ))}
      {(job.status === "queued" || job.status === "running") && job.progress.every((p) => p.status !== "running") && (
        <p className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> {t("running")}
        </p>
      )}
      {job.status === "failed" && <p className="text-destructive">{t(isLocalMode ? "failedLocal" : "failed", { error: job.error ?? "" })}</p>}
    </div>
  );
}
