"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useMe } from "@/features/account/api/use-me";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/i18n/routing";
import {
  ENABLED_SUBJECTS,
  isWritingSubject,
  type Subject,
} from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { isLocalMode } from "@/lib/app-mode";
import { useDashboard, useLocalSubjects } from "../api/use-dashboard";
import { CriterionChart } from "./criterion-chart";
import { ErrorTagList } from "./error-tag-list";
import { NextStepList } from "./next-step-list";
import { RecentActivity } from "./recent-activity";
import { TopicHeatmap } from "./topic-heatmap";

export function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const me = useMe();
  const localSubjects = useLocalSubjects();
  const loading = isLocalMode ? localSubjects.isLoading : me.isLoading;
  const subjects = (
    (isLocalMode ? localSubjects.data : me.data?.profile?.subjects) ?? []
  ).filter((s) => ENABLED_SUBJECTS.includes(s));
  const [picked, setPicked] = useState<Subject | null>(null);
  const subject = picked && subjects.includes(picked) ? picked : subjects[0];
  const dash = useDashboard(subject);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!subject) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-dashed p-10 text-center">
        <p className="mb-3">{t("noSubjects")}</p>
        <Button asChild>
          <Link href="/settings">{t("chooseSubjects")}</Link>
        </Button>
      </div>
    );
  }

  const writing = isWritingSubject(subject);
  const d = dash.data;
  const empty =
    d &&
    !d.criterionStats.length &&
    !d.errorTags.length &&
    !d.topicMastery.length &&
    !d.recent.length;

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label={t("subject")}
        >
          {subjects.map((s) => (
            <Button
              key={s}
              role="tab"
              aria-selected={s === subject}
              size="sm"
              variant={s === subject ? "default" : "outline"}
              onClick={() => setPicked(s)}
            >
              {tc(`subjects.${s}`)}
            </Button>
          ))}
        </div>
      </div>

      {dash.isLoading && <Skeleton className="h-64 w-full" />}
      {dash.isError && (
        <p className="text-destructive text-sm">{t("loadFailed")}</p>
      )}

      {empty && (
        <Card>
          <CardContent className="grid justify-items-center gap-3 py-10 text-center">
            <p className="text-lg font-medium">{t("emptyTitle")}</p>
            <p className="text-muted-foreground max-w-md text-sm">
              {writing ? t("emptyWriting") : t("emptyPractice")}
            </p>
            <Button asChild>
              <Link href={writing ? "/writing" : "/practice"}>
                {writing ? t("startWriting") : t("startPractice")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {d && !empty && (
        <>
          <Section title={t("nextSteps")}>
            {d.nextSteps.length ? (
              <NextStepList steps={d.nextSteps} subject={subject} />
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("noNextSteps")}
              </p>
            )}
          </Section>

          <div className={cn("grid gap-6", writing && "lg:grid-cols-2")}>
            {writing && (
              <Section
                title={t("criteria")}
                hint={<Badge variant="outline">{tc("beta")}</Badge>}
              >
                {d.criterionStats.length ? (
                  <CriterionChart stats={d.criterionStats} />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("noCriteria")}
                  </p>
                )}
              </Section>
            )}
            <Section title={t("errorTags")}>
              {d.errorTags.length ? (
                <ErrorTagList tags={d.errorTags} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("noErrorTags")}
                </p>
              )}
            </Section>
          </div>

          {!writing && (
            <Section title={t("topicMastery")}>
              <TopicHeatmap subject={subject} mastery={d.topicMastery} />
            </Section>
          )}

          <Section title={t("recent")}>
            <RecentActivity items={d.recent} />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title} {hint}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
