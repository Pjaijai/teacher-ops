"use client";

import { Camera, Keyboard, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUploader, type PickedImage } from "@/components/common/image-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CreditCost } from "@/features/account/components/credits-badge";
import { uploadImages } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { CREDIT_COSTS } from "@/lib/credits";
import { useRouter } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { useCreateSubmission } from "../api/use-submission";
import { errorMessage, isCreditsError } from "../lib/errors";
import { textLength } from "../lib/text-markers";

const draftKey = (questionId: string, parentId?: string | null) => `writing-draft:${questionId}${parentId ? `:${parentId}` : ""}`;

function readDraft(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Write in the editor or upload photos of handwriting. Drafts autosave in this browser. */
export function WritingEditor({
  questionId,
  subject,
  wordLimit,
  parentSubmissionId,
  initialText,
}: {
  questionId: string;
  subject: "chi_writing" | "eng_writing";
  wordLimit: number | null;
  parentSubmissionId?: string | null;
  initialText?: string;
}) {
  const t = useTranslations("writing.editor");
  const router = useRouter();
  const create = useCreateSubmission();
  const key = draftKey(questionId, parentSubmissionId);
  const [text, setText] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [uploading, setUploading] = useState(false);

  // Restore a draft (or the text being revised) once on mount.
  useEffect(() => {
    setText(readDraft(key) || initialText || "");
  }, [key, initialText]);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (text) localStorage.setItem(key, text);
      } catch {
        /* storage unavailable: no autosave */
      }
    }, 600);
    return () => clearTimeout(id);
  }, [key, text]);

  const length = textLength(text, subject);
  const unit = subject === "chi_writing" ? "chars" : "words";
  const over = wordLimit != null && subject === "chi_writing" && length > wordLimit;

  const fail = (e: unknown) => {
    if (!isCreditsError(e)) toast.error(errorMessage(e, t("failed")));
  };

  const submitTyped = async () => {
    try {
      const res = await create.mutateAsync({ questionId, inputMode: "typed", text, parentSubmissionId: parentSubmissionId ?? undefined });
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      router.push(`/writing/submissions/${res.submissionId}`);
    } catch (e) {
      fail(e);
    }
  };

  const submitPhotos = async () => {
    setUploading(true);
    try {
      const files = images.map((i) => i.file);
      const res = isLocalMode
        ? await create.mutateAsync({ questionId, inputMode: "photo", files, parentSubmissionId: parentSubmissionId ?? undefined })
        : await create.mutateAsync({ questionId, inputMode: "photo", uploadKeys: await uploadImages(files), parentSubmissionId: parentSubmissionId ?? undefined });
      router.push(`/writing/submissions/${res.submissionId}`);
    } catch (e) {
      fail(e);
    } finally {
      setUploading(false);
    }
  };

  const busy = create.isPending || uploading;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{parentSubmissionId ? t("reviseTitle") : t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="typed" className="gap-4">
          <TabsList>
            <TabsTrigger value="typed">
              <Keyboard className="size-4" /> {t("typed")}
            </TabsTrigger>
            <TabsTrigger value="photo">
              <Camera className="size-4" /> {t("photo")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="typed" className="grid gap-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={18}
              maxLength={20000}
              placeholder={t("placeholder")}
              className="min-h-[22rem] text-base leading-relaxed"
              lang={subject === "chi_writing" ? "zh-Hant" : "en"}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={cn("text-muted-foreground text-sm tabular-nums", over && "text-destructive")}>
                {t(`count.${unit}`, { n: length })}
                {wordLimit ? ` / ${t(`count.${unit}`, { n: wordLimit })}` : ""}
                <span className="ml-2 text-xs">{t("autosaved")}</span>
              </p>
              <Button onClick={submitTyped} disabled={busy || length < (subject === "chi_writing" ? 20 : 10)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {t("continue")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="photo" className="grid gap-3">
            <p className="text-muted-foreground text-sm">{t("photoHelp")}</p>
            <ImageUploader images={images} onChange={setImages} label={t("addPhotos")} />
            <div>
              <Button onClick={submitPhotos} disabled={busy || images.length === 0}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                {t("transcribe")}
                <CreditCost cost={CREDIT_COSTS.transcribe_page * Math.max(1, images.length)} />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
