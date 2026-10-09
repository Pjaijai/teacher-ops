"use client";

import { ArrowLeft, FlaskConical, Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCost } from "@/features/account/components/credits-badge";
import { CommunityAnswers } from "@/features/community/components/community-answers";
import { BackToPaper } from "@/features/papers/components/back-to-paper";
import { PublishButton } from "@/features/community/components/publish-dialog";
import { JobProgress } from "@/features/jobs/components/job-progress";
import { isLocalMode } from "@/lib/app-mode";
import { CREDIT_COSTS } from "@/lib/credits";
import { Link } from "@/lib/i18n/routing";
import type { PracticeKind } from "@/lib/schemas/practice";
import { cn } from "@/lib/utils";
import { useAttempt, type AttemptDetail } from "../api/use-attempt";
import { useGetQuestion } from "./generate-panel";
import { LatexLine } from "./latex-transcript-review";
import { MarkBreakdown } from "./mark-breakdown";
import { McOptions } from "./mc-options";
import { QuestionView } from "./question-view";
import { SolutionView } from "./solution-view";

/** /practice/attempts/[id]: score per part, mark-by-mark reasons, first wrong step, 解題 notes, disputes. */
export function AttemptResult({ attemptId }: { attemptId: string }) {
  const t = useTranslations("practice.result");
  const first = useAttempt(attemptId);
  const inProgress = ["transcribing", "marking"].includes(first.data?.attempt.status ?? "");
  const polled = useAttempt(inProgress ? attemptId : null, { poll: true });
  const detail = polled.data ?? first.data;

  if (first.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!detail) return <p className="text-destructive">{t("notFound")}</p>;

  const { attempt, question, solution } = detail;
  const isMc = question.kind === "mc";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/practice/${question.id}`}>
            <ArrowLeft className="size-4" /> {t("backToQuestion")}
          </Link>
        </Button>
        <BackToPaper questionId={question.id} />
      </div>

      <ScoreHeader detail={detail} />

      <Card>
        <CardContent className="pt-6">
          <QuestionView question={question} compact />
          {isMc && detail.mc && (
            <div className="mt-4">
              <McOptions options={question.content.options} outcome={detail.mc} onChoose={() => {}} disabled />
            </div>
          )}
        </CardContent>
      </Card>

      {!isMc && attempt.status !== "marked" && (
        <Card>
          <CardContent className="grid gap-2 pt-6">
            <p className="font-medium">{inProgress ? t("stillMarking") : t("notMarked")}</p>
            {inProgress ? (
              <JobProgress job={null} />
            ) : (
              <Button asChild variant="outline" className="justify-self-start">
                <Link href={`/practice/${question.id}`}>{t("continue")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isMc && attempt.status === "marked" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <TranscriptWithErrors detail={detail} />
          <MarkBreakdown detail={detail} solution={solution} />
        </div>
      )}

      <Tabs defaultValue="solution" className="print:block">
        {!isLocalMode && (
          <TabsList className="print:hidden">
            <TabsTrigger value="solution">{t("tabs.solution")}</TabsTrigger>
            <TabsTrigger value="community">{t("tabs.community")}</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="solution">
          <Card>
            <CardContent className="pt-6">{solution ? <SolutionView solution={solution} /> : <p className="text-muted-foreground text-sm">{t("solutionLocked")}</p>}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="community">
          <CommunityAnswers questionId={question.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreHeader({ detail }: { detail: AttemptDetail }) {
  const t = useTranslations("practice.result");
  const { attempt, question } = detail;
  const similar = useGetQuestion();
  const marked = attempt.status === "marked";
  const pct = marked && attempt.maxScore ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-4">
        <div className="mr-auto grid gap-1">
          <CardTitle className="text-xl">{question.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <FlaskConical className="size-3" /> {t("beta")}
            </Badge>
            {question.kind === "mc" && <Badge variant="secondary">{t("mcInstant")}</Badge>}
          </div>
        </div>
        {marked && (
          <div className="text-right">
            <div className={cn("text-3xl font-semibold tabular-nums", pct !== null && pct >= 50 ? "text-mark-good" : "text-mark-wrong")}>
              {attempt.score ?? 0}
              <span className="text-muted-foreground text-lg font-normal"> / {attempt.maxScore ?? 0}</span>
            </div>
            <div className="text-muted-foreground text-xs">{t("score")}</div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 print:hidden">
        {marked && <PublishButton sourceType="attempt" sourceId={attempt.id} questionId={question.id} isPrivateQuestion={question.isPrivate} />}
        <Button
          variant="outline"
          disabled={similar.busy}
          onClick={() =>
            similar.start({
              subject: question.subject,
              kind: (["mc", "short", "long"].includes(question.kind) ? question.kind : "short") as PracticeKind,
              topicIds: question.topicIds,
              difficulty: question.difficulty,
              extension: question.extension,
              language: question.language,
            })
          }
        >
          <Shuffle className="size-4" /> {t("similar")}
          <CreditCost cost={CREDIT_COSTS.new_question} />
        </Button>
        {similar.jobId && <JobProgress job={similar.job} />}
      </CardContent>
    </Card>
  );
}

/** The checked transcript with each part's first wrong step highlighted. */
function TranscriptWithErrors({ detail }: { detail: AttemptDetail }) {
  const t = useTranslations("practice.result");
  const lines = detail.attempt.editedTranscript ?? detail.attempt.aiTranscript ?? [];
  const wrongAt = new Map<number, string[]>();
  for (const p of detail.parts) if (p.firstWrongLine !== null) wrongAt.set(p.firstWrongLine, [...(wrongAt.get(p.firstWrongLine) ?? []), p.part]);
  const editedAt = new Set(detail.attempt.edits.map((e) => e.at));

  return (
    <Card className="content-start">
      <CardHeader>
        <CardTitle className="text-base">{t("yourWorking")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-1">
          {lines.map((l, i) => {
            const wrongParts = wrongAt.get(i);
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded px-1.5 py-1 text-sm",
                  wrongParts && "bg-mark-wrong-bg ring-mark-wrong/40 ring-1",
                )}
              >
                <span className="text-muted-foreground w-6 shrink-0 pt-0.5 text-right font-mono text-xs">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <LatexLine latex={l.latex} />
                  {wrongParts && (
                    <span className="text-mark-wrong text-xs font-medium">
                      {t("firstWrong", { parts: wrongParts.map((p) => (p ? `(${p})` : "")).join(" ") })}
                    </span>
                  )}
                </div>
                {editedAt.has(i) && (
                  <Badge variant="outline" className="shrink-0 text-[0.7rem]">
                    {t("edited")}
                  </Badge>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
