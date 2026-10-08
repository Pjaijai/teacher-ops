"use client";

import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityAnswers } from "@/features/community/components/community-answers";
import { isLocalMode } from "@/lib/app-mode";
import { Link } from "@/lib/i18n/routing";
import { useSubmission } from "../api/use-submission";
import { useWritingTask } from "../api/use-writing-task";
import { HelperPanel } from "./helper-panel";
import { RecentSubmissions } from "./recent-submissions";
import { TaskView } from "./task-view";
import { WritingEditor } from "./writing-editor";

/** /writing/[questionId]: the task, Ask-AI helpers, and the editor or photo upload. `?revise=<submissionId>` starts a revision. */
export function TaskScreen({ questionId }: { questionId: string }) {
  const t = useTranslations("writing");
  const reviseId = useSearchParams().get("revise");
  const task = useWritingTask(questionId);

  if (task.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  if (!task.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("errors.taskNotFound")}</AlertDescription>
      </Alert>
    );
  }
  const { question, helpers } = task.data;
  const subject = question.subject as "chi_writing" | "eng_writing";

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/writing">
            <ArrowLeft className="size-4" /> {t("nav.back")}
          </Link>
        </Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="grid gap-6">
          <TaskView question={question} />
          {reviseId ? (
            <ReviseEditor questionId={questionId} subject={subject} wordLimit={question.content.writing?.wordLimit ?? null} parentId={reviseId} />
          ) : (
            <WritingEditor questionId={questionId} subject={subject} wordLimit={question.content.writing?.wordLimit ?? null} />
          )}
        </div>
        <div className="grid gap-6 lg:sticky lg:top-4">
          <HelperPanel questionId={questionId} subject={subject} helpers={helpers} />
        </div>
      </div>
      {isLocalMode ? (
        <RecentSubmissions questionId={questionId} title={t("task.mySubmissions")} />
      ) : (
      <Tabs defaultValue="mine" className="gap-4">
        <TabsList>
          <TabsTrigger value="mine">{t("task.mySubmissions")}</TabsTrigger>
          <TabsTrigger value="community">{t("task.community")}</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <RecentSubmissions questionId={questionId} title={t("task.mySubmissions")} />
        </TabsContent>
        <TabsContent value="community">
          <CommunityAnswers questionId={questionId} />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

/** Revise & resubmit: the editor starts from the previous submission's final text. */
function ReviseEditor({ questionId, subject, wordLimit, parentId }: { questionId: string; subject: "chi_writing" | "eng_writing"; wordLimit: number | null; parentId: string }) {
  const parent = useSubmission(parentId);
  if (parent.isLoading) return <Skeleton className="h-80 w-full" />;
  return (
    <WritingEditor
      questionId={questionId}
      subject={subject}
      wordLimit={wordLimit}
      parentSubmissionId={parent.data ? parentId : null}
      initialText={parent.data?.cleanText ?? ""}
    />
  );
}
