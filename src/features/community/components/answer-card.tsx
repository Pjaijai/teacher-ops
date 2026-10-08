"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { KatexText } from "@/components/math/katex-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApiClientError } from "@/lib/api-client";
import { useReportAnswer, useVote, type AnswerSort } from "../api/use-community-answers";
import { VoteButtons } from "./vote-buttons";

type Answer = {
  id: string;
  nickname: string;
  body: string;
  scoreSummary: unknown;
  feedbackSummary: unknown;
  upvotes: number;
  downvotes: number;
  publishedAt: string;
  isMine: boolean;
  myVote: 1 | -1 | 0;
};

type Score = { level?: number; totalMarks?: number; maxMarks?: number; score?: number; maxScore?: number | null; correct?: boolean | null };
type Feedback = { overall?: string | null; strengths?: string[] };

export function AnswerCard({ answer, questionId, sort }: { answer: Answer; questionId: string; sort: AnswerSort }) {
  const t = useTranslations("community");
  const vote = useVote(questionId, sort);
  const report = useReportAnswer(questionId);
  const score = answer.scoreSummary as Score | null;
  const fb = answer.feedbackSummary as Feedback | null;

  const scoreText = score
    ? score.level != null
      ? t("scoreLevel", { level: score.level, marks: score.totalMarks ?? 0, max: score.maxMarks ?? 0 })
      : score.score != null
        ? t("scoreMarks", { score: score.score, max: score.maxScore ?? "?" })
        : score.correct != null
          ? t(score.correct ? "correct" : "incorrect")
          : null
    : null;

  return (
    <Card>
      <CardContent className="flex gap-3">
        <VoteButtons
          up={answer.upvotes}
          down={answer.downvotes}
          myVote={answer.myVote}
          disabled={answer.isMine}
          onVote={(value) => vote.mutate({ answerId: answer.id, value }, { onError: () => toast.error(t("voteFailed")) })}
        />
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{answer.nickname}</span>
            {answer.isMine && <Badge variant="secondary">{t("you")}</Badge>}
            <span className="text-muted-foreground text-xs">{new Date(answer.publishedAt).toLocaleDateString()}</span>
            {scoreText && <Badge variant="outline">{scoreText}</Badge>}
            {!answer.isMine && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="xs" className="text-muted-foreground ml-auto">
                    <Flag /> {t("report")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["wrong", "inappropriate", "personal_info"] as const).map((reason) => (
                    <DropdownMenuItem
                      key={reason}
                      onSelect={() =>
                        report.mutate(
                          { answerId: answer.id, reason },
                          {
                            onSuccess: () => toast.success(t("reported")),
                            onError: (e) => toast.error(e instanceof ApiClientError && e.status === 409 ? t("alreadyReported") : t("reportFailed")),
                          },
                        )
                      }
                    >
                      {t(`reasons.${reason}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <KatexText className="whitespace-pre-wrap break-words">{answer.body}</KatexText>
          {fb && (fb.overall || fb.strengths?.length) ? (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p className="mb-1 font-medium">{t("feedbackSummary")}</p>
              {fb.overall && <p>{fb.overall}</p>}
              {fb.strengths?.length ? (
                <ul className="mt-1 list-disc pl-5">
                  {fb.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
