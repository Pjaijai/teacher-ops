"use client";

import { ScanText, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ImageUploader, type PickedImage } from "@/components/common/image-uploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CreditCost } from "@/features/account/components/credits-badge";
import { JobProgress } from "@/features/jobs/components/job-progress";
import { useJobStream } from "@/features/jobs/api/use-job-stream";
import { ApiClientError } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { CREDIT_COSTS } from "@/lib/credits";
import { Link, useRouter } from "@/lib/i18n/routing";
import type { PracticeKind, Understanding } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import { useReferenceGenerate, useReferenceUnderstand } from "../api/use-reference";
import { kindsFor } from "../lib/units";
import { ReferenceUnderstandingForm } from "./reference-understanding";

type Understood = Understanding & { figureProblems?: string[] };

/** Photo or typed reference question → understanding (editable) → variation level and count → private variants. */
export function ReferencePanel({ subject, language }: { subject: Subject; language: "zh" | "en" }) {
  const t = useTranslations("practice.reference");
  const options = useTranslations("practice.options");
  const common = useTranslations("common");
  const router = useRouter();
  const [images, setImages] = useState<PickedImage[]>([]);
  const [text, setText] = useState("");
  const [understanding, setUnderstanding] = useState<Understood | null>(null);
  const [variation, setVariation] = useState<1 | 2 | 3>(1);
  const [count, setCount] = useState(1);
  const [kind, setKind] = useState<PracticeKind>("short");
  const [lang, setLang] = useState<"zh" | "en">(language);
  const [understandJob, setUnderstandJob] = useState<string | null>(null);
  const [generateJob, setGenerateJob] = useState<string | null>(null);
  const [made, setMade] = useState<string[]>([]);

  const understand = useReferenceUnderstand();
  const generate = useReferenceGenerate();

  const uJob = useJobStream(understandJob, {
    onDone: (j) => {
      const u = (j.output as { understanding?: Understood } | null)?.understanding;
      if (u) {
        setUnderstanding(u);
        setKind(kindsFor(subject).includes(u.kind) ? u.kind : "short");
        setLang(u.language);
      }
    },
  });
  const gJob = useJobStream(generateJob, {
    onDone: (j) => {
      const ids = (j.output as { questionIds?: string[] } | null)?.questionIds ?? [];
      setMade(ids);
      if (ids.length === 1) router.push(`/practice/${ids[0]}`);
    },
  });

  const onError = (e: unknown) => {
    if (!(e instanceof ApiClientError && e.status === 402)) toast.error(e instanceof ApiClientError ? e.message : common("error"));
  };

  const startUnderstand = async () => {
    try {
      setUnderstanding(null);
      setMade([]);
      const res = await understand.mutateAsync({ subject, files: images.map((i) => i.file), text });
      setUnderstandJob(res.jobId);
    } catch (e) {
      onError(e);
    }
  };

  const startGenerate = async () => {
    if (!understanding) return;
    try {
      setMade([]);
      const { figureProblems: _ignored, ...u } = understanding;
      const res = await generate.mutateAsync({ subject, understanding: u, variation, kind, count, language: lang });
      setGenerateJob(res.jobId);
    } catch (e) {
      onError(e);
    }
  };

  const understanding_running = understand.isPending || (understandJob !== null && !understanding && uJob?.status !== "failed");
  const generating = generate.isPending || (generateJob !== null && made.length === 0 && gJob?.status !== "failed");

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <p className="text-muted-foreground text-sm">{t("intro")}</p>
        <ImageUploader images={images} onChange={setImages} max={4} label={t("addPhoto")} />
        <div className="grid gap-1.5">
          <Label htmlFor="ref-typed">{t("orType")}</Label>
          <Textarea id="ref-typed" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.has(`typePlaceholders.${subject}`) ? t(`typePlaceholders.${subject}`) : t("typePlaceholder")} className="min-h-20" />
        </div>
        <div>
          <Button onClick={startUnderstand} disabled={understanding_running || (images.length === 0 && !text.trim())}>
            <ScanText className="size-4" />
            {t("understand")}
            <CreditCost cost={CREDIT_COSTS.reference_understand} />
          </Button>
        </div>
        {understandJob && !understanding && <JobProgress job={uJob} />}
      </div>

      {understanding && (
        <>
          <Separator />
          <div className="grid gap-1">
            <h3 className="font-semibold">{t("understoodTitle")}</h3>
            <p className="text-muted-foreground text-sm">{t("understoodHint")}</p>
          </div>
          <ReferenceUnderstandingForm
            subject={subject}
            value={understanding}
            onChange={(u) => setUnderstanding({ ...u, figureProblems: understanding.figureProblems })}
            figureProblems={understanding.figureProblems}
          />
          <Separator />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("variation")}</Label>
              <RadioGroup value={String(variation)} onValueChange={(v) => setVariation(Number(v) as 1 | 2 | 3)} className="grid gap-2">
                {([1, 2, 3] as const).map((lv) => (
                  <label key={lv} className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm">
                    <RadioGroupItem value={String(lv)} className="mt-0.5" />
                    <span>
                      <span className="font-medium">{t(`levels.${lv}.name`)}</span>
                      <span className="text-muted-foreground block text-xs">{t(`levels.${lv}.description`)}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid content-start gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">{options("kind")}</Label>
                <ToggleGroup type="single" variant="outline" value={kind} onValueChange={(k) => k && setKind(k as PracticeKind)}>
                  {kindsFor(subject).map((k) => (
                    <ToggleGroupItem key={k} value={k}>
                      {options(`kinds.${k}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{t("count")}</Label>
                <ToggleGroup type="single" variant="outline" value={String(count)} onValueChange={(c) => c && setCount(Number(c))}>
                  {[1, 2, 3, 4, 5].map((c) => (
                    <ToggleGroupItem key={c} value={String(c)} className="w-9 tabular-nums">
                      {c}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{t("language")}</Label>
                <ToggleGroup type="single" variant="outline" value={lang} onValueChange={(l) => l && setLang(l as "zh" | "en")}>
                  <ToggleGroupItem value="zh">中文</ToggleGroupItem>
                  <ToggleGroupItem value="en">English</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={startGenerate} disabled={generating || !understanding.questionText.trim()}>
              <Sparkles className="size-4" />
              {t("generate", { count })}
              <CreditCost cost={CREDIT_COSTS.reference_generate * count} />
            </Button>
            <span className="text-muted-foreground text-xs">{isLocalMode ? t("privateNoteLocal") : t("privateNote")}</span>
          </div>
          {generateJob && made.length === 0 && <JobProgress job={gJob} />}
          {made.length > 1 && (
            <div className="grid gap-2">
              <p className="text-sm font-medium">{t("made", { count: made.length })}</p>
              <div className="flex flex-wrap gap-2">
                {made.map((id, i) => (
                  <Button key={id} variant="outline" size="sm" asChild>
                    <Link href={`/practice/${id}`}>{t("variant", { n: i + 1 })}</Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
