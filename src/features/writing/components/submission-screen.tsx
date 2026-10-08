"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCost } from "@/features/account/components/credits-badge";
import { useJobStream } from "@/features/jobs/api/use-job-stream";
import { JobProgress } from "@/features/jobs/components/job-progress";
import { isLocalMode } from "@/lib/app-mode";
import { CREDIT_COSTS } from "@/lib/credits";
import { Link } from "@/lib/i18n/routing";
import { qk } from "@/lib/query-keys";
import { useRetryTranscription, useSubmission } from "../api/use-submission";
import { errorMessage, isCreditsError } from "../lib/errors";
import { FeedbackView } from "./feedback-view";
import { StatusBadge } from "./recent-submissions";
import { TaskView } from "./task-view";
import { TranscriptReview } from "./transcript-review";

/** /writing/submissions/[id]: transcribing → review → grading → feedback (one page, by status). */
export function SubmissionScreen({ id }: { id: string }) {
  const t = useTranslations("writing");
  const qc = useQueryClient();
  const sub = useSubmission(id);
  const retry = useRetryTranscription(id);

  const refresh = () => qc.invalidateQueries({ queryKey: qk.submission(id) });
  const job = useJobStream(sub.data?.activeJob?.id, {
    onDone: () => void refresh(),
    onFailed: (j) => {
      toast.error(t(isLocalMode ? "errors.jobFailedLocal" : "errors.jobFailed", { error: j.error ?? "" }));
      void refresh();
    },
  });

  if (sub.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!sub.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("errors.submissionNotFound")}</AlertDescription>
      </Alert>
    );
  }
  const data = sub.data;
  const s = data.submission;
  const status = s.status;
  const working = status === "transcribing" || status === "grading";

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/writing/${s.questionId}`}>
            <ArrowLeft className="size-4" /> {t("nav.backToTask")}
          </Link>
        </Button>
        <StatusBadge status={status} />
        {s.parentSubmissionId && (
          <Link href={`/writing/submissions/${s.parentSubmissionId}`} className="text-muted-foreground text-sm underline-offset-4 hover:underline">
            {t("nav.previousVersion")}
          </Link>
        )}
        {data.revisions.map((r, i) => (
          <Link key={r.id} href={`/writing/submissions/${r.id}`} className="text-muted-foreground text-sm underline-offset-4 hover:underline">
            {t("nav.revision", { n: i + 1 })}
          </Link>
        ))}
      </div>

      <details className="group">
        <summary className="text-muted-foreground cursor-pointer text-sm">
          {t("nav.showTask")}: <span className="text-foreground font-medium">{data.question.title}</span>
        </summary>
        <div className="mt-3">
          <TaskView question={data.question} compact />
        </div>
      </details>

      {working && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin" />
              {status === "transcribing" ? t("progress.transcribing") : t("progress.grading")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-muted-foreground text-sm">{status === "transcribing" ? t(isLocalMode ? "progress.transcribingHelpLocal" : "progress.transcribingHelp") : t(isLocalMode ? "progress.gradingHelpLocal" : "progress.gradingHelp")}</p>
            {data.activeJob ? <JobProgress job={job} /> : (
              <Button variant="outline" size="sm" className="w-fit" onClick={() => void refresh()}>
                <RefreshCw className="size-4" /> {t("progress.refresh")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {status === "transcribe_failed" && (
        <Alert variant="destructive">
          <AlertTitle>{t("progress.transcribeFailed")}</AlertTitle>
          <AlertDescription className="grid gap-3">
            <p>{t(isLocalMode ? "progress.transcribeFailedHelpLocal" : "progress.transcribeFailedHelp")}</p>
            <Button
              size="sm"
              className="w-fit"
              disabled={retry.isPending}
              onClick={async () => {
                try {
                  await retry.mutateAsync();
                } catch (e) {
                  if (!isCreditsError(e)) toast.error(errorMessage(e, t("errors.generic")));
                }
              }}
            >
              <RefreshCw className="size-4" /> {t("progress.retry")}
              <CreditCost cost={CREDIT_COSTS.transcribe_page * Math.max(1, data.pages.length)} />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status === "review" && <TranscriptReview data={data} />}
      {status === "graded" && <FeedbackView data={data} job={job} />}
    </div>
  );
}
