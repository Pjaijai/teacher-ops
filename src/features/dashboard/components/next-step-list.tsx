"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/i18n/routing";
import type { Subject } from "@/lib/subjects";
import { useSetNextStep, type Dashboard } from "../api/use-dashboard";

export function NextStepList({
  steps,
  subject,
}: {
  steps: Dashboard["nextSteps"];
  subject: Subject;
}) {
  const t = useTranslations("dashboard");
  const set = useSetNextStep(subject);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {steps.map((s) => {
        const target = s.target as {
          href?: string;
          criterion?: string;
          tag?: string;
          topicId?: string;
        };
        const known = ["revise", "helper", "question", "topic"].includes(
          s.kind,
        );
        return (
          <Card key={s.id}>
            <CardContent className="grid gap-2">
              <p className="font-medium">
                {known
                  ? t(`steps.${s.kind}.title` as "steps.revise.title")
                  : s.rationale}
              </p>
              <p className="text-muted-foreground text-sm">
                {known
                  ? t(`steps.${s.kind}.body` as "steps.revise.body", {
                      criterion: target.criterion ?? "",
                      tag: target.tag ?? "",
                      topic: target.topicId ?? "",
                    })
                  : null}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {target.href && (
                  <Button asChild size="sm">
                    <Link href={target.href as never}>
                      {t("go")} <ArrowRight />
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => set.mutate({ id: s.id, status: "done" })}
                  aria-label={t("markDone")}
                  title={t("markDone")}
                >
                  <Check />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => set.mutate({ id: s.id, status: "dismissed" })}
                  aria-label={t("dismiss")}
                  title={t("dismiss")}
                >
                  <X />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
