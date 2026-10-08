"use client";

import { ArrowLeft, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityAnswers } from "@/features/community/components/community-answers";
import { ApiClientError } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { Link } from "@/lib/i18n/routing";
import { useAnswerMc, useCreateAttempt, type McResponse } from "../api/use-attempt";
import { usePracticeQuestion } from "../api/use-practice-question";
import { McOptions } from "./mc-options";
import { QuestionView } from "./question-view";
import { SolutionView } from "./solution-view";
import { WrittenAnswer } from "./written-answer";

const UNFINISHED = ["answering", "transcribing", "review", "marking"];

/** /practice/[questionId]: the question, answering (MC or written), then Solution and Community tabs. */
export function PracticeQuestionPage({ questionId }: { questionId: string }) {
  const t = useTranslations("practice.question");
  const common = useTranslations("common");
  const q = usePracticeQuestion(questionId);
  const create = useCreateAttempt();
  const answerMc = useAnswerMc(questionId);
  const [mcResult, setMcResult] = useState<McResponse | null>(null);

  if (q.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!q.data) return <p className="text-destructive">{q.error instanceof ApiClientError ? q.error.message : common("error")}</p>;

  const { question, attempts } = q.data;
  const solution = mcResult?.solution ?? q.data.solution;
  const attempted = q.data.attempted || mcResult !== null;
  const isMc = question.kind === "mc";
  const lastMc = attempts.find((a) => a.mcChoice);
  const resume = attempts.find((a) => UNFINISHED.includes(a.status))?.id ?? null;

  const chooseMc = async (choice: "A" | "B" | "C" | "D") => {
    try {
      const a = await create.mutateAsync(questionId);
      setMcResult(await answerMc.mutateAsync({ attemptId: a.id, choice }));
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : common("error"));
    }
  };

  const outcome = mcResult ?? (lastMc && solution ? { choice: lastMc.mcChoice!, correct: Boolean(lastMc.mcCorrect), correctOption: solution.correctOption, misconception: solution.distractorNotes.find((d) => d.label === lastMc.mcChoice && !lastMc.mcCorrect)?.misconception ?? null } : null);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/practice">
            <ArrowLeft className="size-4" /> {t("back")}
          </Link>
        </Button>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardContent className="grid gap-5 pt-6">
          <QuestionView question={question} />
          {isMc && (
            <McOptions options={question.content.options} outcome={outcome} disabled={create.isPending || answerMc.isPending} onChoose={chooseMc} />
          )}
        </CardContent>
      </Card>

      {!isMc && <WrittenAnswer questionId={questionId} resumeAttemptId={resume} />}

      {attempts.some((a) => a.status === "marked") && (
        <Card className="print:hidden">
          <CardContent className="grid gap-2 pt-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <History className="size-4" /> {t("yourAttempts")}
            </p>
            <div className="flex flex-wrap gap-2">
              {attempts
                .filter((a) => a.status === "marked")
                .map((a) => (
                  <Button key={a.id} variant="outline" size="sm" asChild>
                    <Link href={`/practice/attempts/${a.id}`}>
                      {new Date(a.createdAt).toLocaleDateString()}
                      <Badge variant="secondary" className="tabular-nums">
                        {a.score ?? 0}/{a.maxScore ?? 0}
                      </Badge>
                    </Link>
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {attempted && (
        <Tabs defaultValue="solution">
          {!isLocalMode && (
            <TabsList className="print:hidden">
              <TabsTrigger value="solution">{t("tabs.solution")}</TabsTrigger>
              <TabsTrigger value="community">{t("tabs.community")}</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="solution">
            <Card>
              <CardContent className="pt-6">{solution && <SolutionView solution={solution} />}</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="community">
            <CommunityAnswers questionId={questionId} />
          </TabsContent>
        </Tabs>
      )}
      {!attempted && <p className="text-muted-foreground text-sm print:hidden">{isLocalMode ? t("solutionAfterLocal") : t("solutionAfter")}</p>}
    </div>
  );
}
