"use client";

import { CheckCircle2, Keyboard, Loader2, Save, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUploader, type PickedImage } from "@/components/common/image-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCost } from "@/features/account/components/credits-badge";
import { JobProgress } from "@/features/jobs/components/job-progress";
import { useJobStream } from "@/features/jobs/api/use-job-stream";
import { ApiClientError } from "@/lib/api-client";
import { CREDIT_COSTS } from "@/lib/credits";
import { Link, useRouter } from "@/lib/i18n/routing";
import { useAttempt, useCreateAttempt, useMark, useSaveTranscript, useUploadPages } from "../api/use-attempt";
import { LatexTranscriptReview, type Line } from "./latex-transcript-review";

/**
 * Written answers: photos → AI transcript (LaTeX, line by line) → student checks it → Mark.
 * Resumes an unfinished attempt (answering / transcribing / review / marking).
 */
export function WrittenAnswer({ questionId, resumeAttemptId }: { questionId: string; resumeAttemptId: string | null }) {
  const t = useTranslations("practice.answer");
  const common = useTranslations("common");
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(resumeAttemptId);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [transcribeJob, setTranscribeJob] = useState<string | null>(null);
  const [markJob, setMarkJob] = useState<string | null>(null);

  const create = useCreateAttempt();
  const upload = useUploadPages();
  const mark = useMark(attemptId ?? "");
  const save = useSaveTranscript(attemptId ?? "");

  const status = (attemptStatus: string | undefined) => attemptStatus ?? "answering";
  const pollable = (s: string) => s === "transcribing" || s === "marking";
  const attempt = useAttempt(attemptId);
  const current = status(attempt.data?.attempt.status);
  const polling = useAttempt(attemptId && pollable(current) && !transcribeJob && !markJob ? attemptId : null, { poll: true });
  const data = polling.data ?? attempt.data;
  const st = status(data?.attempt.status);

  useEffect(() => setAttemptId(resumeAttemptId), [resumeAttemptId]);

  // Load the transcript for review once it exists.
  useEffect(() => {
    if (st === "review" && lines === null && data?.attempt.editedTranscript) setLines(data.attempt.editedTranscript);
  }, [st, data, lines]);

  useEffect(() => {
    if (st === "marked" && attemptId && !markJob) router.push(`/practice/attempts/${attemptId}`);
  }, [st, attemptId, markJob, router]);

  const tJob = useJobStream(transcribeJob, {
    onDone: async () => {
      const fresh = await attempt.refetch();
      setLines(fresh.data?.attempt.editedTranscript ?? []);
      setTranscribeJob(null);
    },
    onFailed: () => void attempt.refetch(),
  });
  const mJob = useJobStream(markJob, {
    onDone: () => attemptId && router.push(`/practice/attempts/${attemptId}`),
    onFailed: () => void attempt.refetch(),
  });

  const onError = (e: unknown) => {
    if (!(e instanceof ApiClientError && e.status === 402)) toast.error(e instanceof ApiClientError ? e.message : common("error"));
  };

  const ensureAttempt = async () => {
    if (attemptId) return attemptId;
    const a = await create.mutateAsync(questionId);
    setAttemptId(a.id);
    return a.id;
  };

  const startUpload = async () => {
    try {
      const id = await ensureAttempt();
      const res = await upload.mutateAsync({ attemptId: id, files: images.map((i) => i.file) });
      setLines(null);
      setTranscribeJob(res.jobId);
      void attempt.refetch();
    } catch (e) {
      onError(e);
    }
  };

  const startTyping = async () => {
    try {
      await ensureAttempt();
      setLines([{ latex: "" }]);
    } catch (e) {
      onError(e);
    }
  };

  const saveLines = async () => {
    if (!lines) return;
    try {
      await save.mutateAsync(lines);
      toast.success(t("saved"));
    } catch (e) {
      onError(e);
    }
  };

  const startMark = async () => {
    if (!lines || !attemptId) return;
    try {
      await save.mutateAsync(lines);
      const res = await mark.mutateAsync();
      setMarkJob(res.jobId);
    } catch (e) {
      onError(e);
    }
  };

  const busyUpload = create.isPending || upload.isPending;
  const typing = lines !== null && (st === "answering" || st === "review");
  const pageCount = images.length;

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {/* 1. Upload photos (or type) */}
        {st === "answering" && !transcribeJob && !typing && (
          <div className="grid gap-3">
            <ImageUploader images={images} onChange={setImages} label={t("addPhotos")} />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={startUpload} disabled={pageCount === 0 || busyUpload}>
                {busyUpload ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {t("upload", { count: pageCount })}
                <CreditCost cost={CREDIT_COSTS.transcribe_page * Math.max(pageCount, 1)} />
              </Button>
              <Button variant="ghost" onClick={startTyping} disabled={busyUpload}>
                <Keyboard className="size-4" /> {t("typeInstead")}
              </Button>
            </div>
          </div>
        )}

        {/* 2. Transcribing */}
        {(transcribeJob || st === "transcribing") && (
          <div className="bg-muted/40 rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">{t("transcribing")}</p>
            <JobProgress job={transcribeJob ? tJob : null} />
          </div>
        )}

        {/* 3. Review the transcript */}
        {typing && !transcribeJob && lines && (
          <div className="grid gap-4">
            <LatexTranscriptReview lines={lines} aiLines={data?.attempt.aiTranscript ?? null} onChange={setLines} pages={data?.pages ?? []} />
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Button variant="outline" onClick={saveLines} disabled={save.isPending || !!markJob}>
                <Save className="size-4" /> {t("save")}
              </Button>
              <Button onClick={startMark} disabled={save.isPending || mark.isPending || !!markJob || !lines.some((l) => l.latex.trim())}>
                <CheckCircle2 className="size-4" /> {t("mark")}
                <CreditCost cost={CREDIT_COSTS.mark_answer} />
              </Button>
              <span className="text-muted-foreground text-xs">{t("markHint")}</span>
            </div>
          </div>
        )}

        {/* 4. Marking */}
        {(markJob || st === "marking") && (
          <div className="bg-muted/40 rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">{t("marking")}</p>
            <JobProgress job={markJob ? mJob : null} />
          </div>
        )}

        {st === "marked" && attemptId && (
          <Button asChild variant="outline" className="justify-self-start">
            <Link href={`/practice/attempts/${attemptId}`}>{t("seeMarks")}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
