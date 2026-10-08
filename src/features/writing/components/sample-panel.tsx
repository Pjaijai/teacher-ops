"use client";

import { Loader2, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCost } from "@/features/account/components/credits-badge";
import { JobProgress } from "@/features/jobs/components/job-progress";
import type { PublicJob } from "@/server/api/routes/jobs";
import { CREDIT_COSTS } from "@/lib/credits";
import { useRequestSample } from "../api/use-submission";
import { errorMessage, isCreditsError } from "../lib/errors";
import { levelLabel } from "../lib/segments";

/** Generate a level sample: an upgraded rewrite of the student's own essay at the chosen level. */
export function SamplePanel({
  submissionId,
  estimateLevel,
  job,
  running,
}: {
  submissionId: string;
  estimateLevel: number | null;
  job: PublicJob | null;
  running: boolean;
}) {
  const t = useTranslations("writing.sample");
  const common = useTranslations("common");
  const fallback = estimateLevel ? Math.min(7, estimateLevel + 1) : 4;
  const [target, setTarget] = useState(String(fallback));
  const request = useRequestSample(submissionId);

  const go = async () => {
    try {
      await request.mutateAsync(Number(target));
    } catch (e) {
      if (!isCreditsError(e)) toast.error(errorMessage(e, common("error")));
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label>{t("targetLabel")}</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6, 7].map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {t("levelOption", { level: levelLabel(l) })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={go} disabled={request.isPending || running}>
          {request.isPending || running ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {t("generate")}
          <CreditCost cost={CREDIT_COSTS.level_sample} />
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{estimateLevel ? t("defaultFromEstimate", { level: levelLabel(fallback) }) : t("defaultNoEstimate")}</p>
      {running && <JobProgress job={job} />}
    </div>
  );
}
