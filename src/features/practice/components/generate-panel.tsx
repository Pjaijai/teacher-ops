"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCost } from "@/features/account/components/credits-badge";
import { useMe } from "@/features/account/api/use-me";
import { JobProgress } from "@/features/jobs/components/job-progress";
import { useJobStream } from "@/features/jobs/api/use-job-stream";
import { ApiClientError } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { CREDIT_COSTS } from "@/lib/credits";
import { useRouter } from "@/lib/i18n/routing";
import type { Subject } from "@/lib/subjects";
import { useNextQuestion, type NextQuestionRequest } from "../api/use-practice-question";
import { QuestionOptions, type QuestionOptionsValue } from "./question-options";
import { ReferencePanel } from "./reference-panel";
import { hasExtension, kindsFor } from "../lib/units";
import { TopicTreePicker } from "./topic-tree-picker";

/** Hook shared by the generate panel and "try a similar question": bank first, else generate (follows the job). Local mode always generates. */
export function useGetQuestion() {
  const next = useNextQuestion();
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const common = useTranslations("common");
  const job = useJobStream(jobId, {
    onDone: (j) => {
      const id = (j.output as { questionId?: string } | null)?.questionId;
      if (id) router.push(`/practice/${id}`);
      setJobId(null);
    },
  });

  const start = async (req: NextQuestionRequest) => {
    try {
      const res = await next.mutateAsync(req);
      if (res.questionId) router.push(`/practice/${res.questionId}`);
      else if (res.jobId) setJobId(res.jobId);
    } catch (e) {
      if (!(e instanceof ApiClientError && e.status === 402)) toast.error(e instanceof ApiClientError ? e.message : common("error"));
    }
  };
  const busy = next.isPending || (jobId !== null && job?.status !== "failed");
  return { start, busy, job, jobId };
}

/** Get a question for one practice subject. Remount it (key = subject) when the subject changes. */
export function GeneratePanel({ subject, defaultTopicIds = [] as string[] }: { subject: Subject; defaultTopicIds?: string[] }) {
  const t = useTranslations("practice.generate");
  const me = useMe();
  const language = me.data?.profile?.examLanguage ?? "en";
  const [tab, setTab] = useState("topic");
  const [topicIds, setTopicIds] = useState<string[]>(defaultTopicIds);
  const [opts, setOpts] = useState<QuestionOptionsValue>({
    kind: "short",
    difficulty: 3,
    extension: me.data?.profile?.extensionTrack ?? true,
  });
  const { start, busy, job, jobId } = useGetQuestion();

  const go = () =>
    start({
      subject,
      kind: kindsFor(subject).includes(opts.kind) ? opts.kind : "short",
      topicIds: tab === "topic" ? topicIds : [],
      difficulty: opts.difficulty,
      extension: hasExtension(subject) ? opts.extension : false,
      language,
    });

  const action = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={go} disabled={busy || (tab === "topic" && topicIds.length === 0)}>
        <Sparkles className="size-4" />
        {t("button")}
        <CreditCost cost={CREDIT_COSTS.new_question} />
      </Button>
      <span className="text-muted-foreground text-xs">{isLocalMode ? t("localNote") : t("bankFirst")}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{isLocalMode ? t("descriptionLocal") : t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="topic">{t("tabs.topic")}</TabsTrigger>
            <TabsTrigger value="type">{t("tabs.type")}</TabsTrigger>
            <TabsTrigger value="reference">{t("tabs.reference")}</TabsTrigger>
          </TabsList>
          <TabsContent value="topic" className="grid gap-5">
            <TopicTreePicker subject={subject} value={topicIds} onChange={setTopicIds} />
            <QuestionOptions subject={subject} value={opts} onChange={setOpts} />
            {action}
          </TabsContent>
          <TabsContent value="type" className="grid gap-5">
            <p className="text-muted-foreground text-sm">{t("typeHint")}</p>
            <QuestionOptions subject={subject} value={opts} onChange={setOpts} />
            {action}
          </TabsContent>
          <TabsContent value="reference">
            <ReferencePanel subject={subject} language={language} />
          </TabsContent>
        </Tabs>
        {jobId && tab !== "reference" && (
          <div className="bg-muted/40 mt-5 rounded-md border p-3">
            <JobProgress job={job} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
