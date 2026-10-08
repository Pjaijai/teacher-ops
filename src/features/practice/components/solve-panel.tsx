"use client";

import { Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ImageUploader, type PickedImage } from "@/components/common/image-uploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { JobProgress } from "@/features/jobs/components/job-progress";
import { useJobStream } from "@/features/jobs/api/use-job-stream";
import { ApiClientError } from "@/lib/api-client";
import { useRouter } from "@/lib/i18n/routing";
import { useSolveQuestion } from "../api/use-practice-question";

/**
 * "Solve my question": the student types or photographs a physics question; the AI finds the syllabus topic and
 * writes the answer and an HKEAA-style marking scheme. Opens the question with the answer shown.
 */
export function SolvePanel({ subject }: { subject: "physics" }) {
  const t = useTranslations("practice.solve");
  const common = useTranslations("common");
  const router = useRouter();
  const solve = useSolveQuestion();
  const [text, setText] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [language, setLanguage] = useState<"auto" | "zh" | "en">("auto");
  const [jobId, setJobId] = useState<string | null>(null);

  const job = useJobStream(jobId, {
    onDone: (j) => {
      const out = j.output as { questionId?: string; note?: string | null } | null;
      if (out?.note) toast.info(out.note);
      if (out?.questionId) router.push(`/practice/${out.questionId}?answer=1`);
      setJobId(null);
    },
  });

  const go = async () => {
    try {
      const res = await solve.mutateAsync({
        subject,
        files: images.map((i) => i.file),
        text,
        language: language === "auto" ? undefined : language,
      });
      setJobId(res.jobId);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : common("error"));
    }
  };

  const busy = solve.isPending || (jobId !== null && job?.status !== "failed");
  const empty = images.length === 0 && !text.trim();

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>
      <ImageUploader images={images} onChange={setImages} max={8} label={t("photo")} />
      {images.length > 1 && <p className="text-muted-foreground -mt-2 text-xs">{t("pagesNote", { count: images.length })}</p>}
      <div className="grid gap-2">
        <Label htmlFor="solve-text">{t("text")}</Label>
        <Textarea
          id="solve-text"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("language")}</Label>
        <ToggleGroup type="single" variant="outline" value={language} onValueChange={(v) => v && setLanguage(v as typeof language)} className="justify-start">
          <ToggleGroupItem value="auto">{t("languageAuto")}</ToggleGroupItem>
          <ToggleGroupItem value="zh">中文</ToggleGroupItem>
          <ToggleGroupItem value="en">English</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={go} disabled={busy || empty}>
          <Wand2 className="size-4" />
          {t("button")}
        </Button>
        <span className="text-muted-foreground text-xs">{t("note")}</span>
      </div>
      {jobId && (
        <div className="bg-muted/40 rounded-md border p-3">
          <JobProgress job={job} />
        </div>
      )}
    </div>
  );
}
