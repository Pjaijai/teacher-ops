"use client";

import { Eye, Loader2, Pencil, Save, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CreditCost } from "@/features/account/components/credits-badge";
import { CREDIT_COSTS } from "@/lib/credits";
import { useSaveText, useSubmitForFeedback, type SubmissionView } from "../api/use-submission";
import { errorMessage, isCreditsError } from "../lib/errors";
import type { TextMark } from "../lib/segments";
import { stripMarkers, textLength } from "../lib/text-markers";
import { MARK_CLASS, MarkedText } from "./marked-text";
import { PhotoViewer } from "./photo-viewer";

/**
 * Review before feedback: photo next to the editable transcript. Unsure characters are yellow,
 * insertions underlined, malformed characters red; changes from the AI's reading are tracked.
 */
export function TranscriptReview({ data }: { data: SubmissionView }) {
  const t = useTranslations("writing.review");
  const common = useTranslations("common");
  const s = data.submission;
  const [text, setText] = useState(s.editedText ?? s.aiText ?? "");
  const [mode, setMode] = useState<"preview" | "edit">(s.inputMode === "typed" ? "edit" : "preview");
  const [wantsEstimate, setWantsEstimate] = useState(false);
  const save = useSaveText(s.id);
  const submit = useSubmitForFeedback(s.id);
  const saved = s.editedText ?? s.aiText ?? "";
  const dirty = text !== saved;

  useEffect(() => setText(s.editedText ?? s.aiText ?? ""), [s.editedText, s.aiText]);

  const stripped = useMemo(() => stripMarkers(text), [text]);
  const marks: TextMark[] = useMemo(() => {
    const m: TextMark[] = [
      ...stripped.unsure.map((r, i) => ({ id: `u${i}`, ...r, kind: "unsure" as const })),
      ...stripped.insertions.map((r, i) => ({ id: `i${i}`, ...r, kind: "insertion" as const })),
      ...stripped.malformed.map((r, i) => ({ id: `m${i}`, start: r.index, end: r.index + 1, kind: "wrong_char" as const })),
    ];
    if (!dirty) for (const [i, e] of s.edits.entries()) if (e.after) m.push({ id: `e${i}`, start: e.at, end: e.at + e.after.length, kind: "edit" });
    return m;
  }, [stripped, dirty, s.edits]);

  const length = textLength(stripped.clean, data.subject);
  const cost = CREDIT_COSTS.writing_feedback + (wantsEstimate ? CREDIT_COSTS.dse_estimate : 0);

  const fail = (e: unknown) => {
    if (!isCreditsError(e)) toast.error(errorMessage(e, common("error")));
  };
  const doSave = async () => {
    try {
      await save.mutateAsync(text);
      toast.success(t("saved"));
    } catch (e) {
      fail(e);
    }
  };
  const doSubmit = async () => {
    try {
      if (dirty) await save.mutateAsync(text);
      await submit.mutateAsync(wantsEstimate && data.estimateAllowed);
    } catch (e) {
      fail(e);
    }
  };

  const hasPhotos = data.pages.length > 0;
  return (
    <div className="grid gap-6">
      <div className={hasPhotos ? "grid items-start gap-6 lg:grid-cols-2" : "grid gap-6"}>
        {hasPhotos && (
          <Card>
            <CardHeader>
              <CardTitle>{t("photos")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoViewer pages={data.pages} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{s.inputMode === "photo" ? t("titlePhoto") : t("titleTyped")}</CardTitle>
            <CardDescription>{s.inputMode === "photo" ? t("descriptionPhoto") : t("descriptionTyped")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {s.inputMode === "photo" && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`${MARK_CLASS.unsure} px-1`}>{t("legend.unsure")}</span>
                <span className={`${MARK_CLASS.insertion} px-1`}>{t("legend.insertion")}</span>
                {data.subject === "chi_writing" && <span className={`${MARK_CLASS.wrong_char} px-1`}>{t("legend.malformed")}</span>}
                <span className={`${MARK_CLASS.edit} px-1`}>{t("legend.edit")}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}>
                <Eye className="size-4" /> {t("preview")}
              </Button>
              <Button size="sm" variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode("edit")}>
                <Pencil className="size-4" /> {t("edit")}
              </Button>
              <span className="text-muted-foreground ml-auto text-sm tabular-nums">{t(`count.${data.subject === "chi_writing" ? "chars" : "words"}`, { n: length })}</span>
            </div>
            {mode === "edit" ? (
              <>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={20} className="min-h-[24rem] text-base leading-relaxed" />
                {s.inputMode === "photo" && <p className="text-muted-foreground text-xs">{t("markerHelp")}</p>}
              </>
            ) : (
              <div className="bg-card max-h-[70vh] overflow-y-auto rounded-md border p-4">
                <MarkedText text={stripped.clean} marks={marks} titleFor={(m) => t.has(`legend.${m.kind}`) ? t(`legend.${m.kind}` as "legend.unsure") : undefined} />
              </div>
            )}
            {dirty && (
              <div>
                <Button size="sm" variant="secondary" onClick={doSave} disabled={save.isPending}>
                  {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {t("save")}
                </Button>
              </div>
            )}
            {s.aiText && !dirty && s.edits.length > 0 && <EditList edits={s.edits} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("submitTitle")}</CardTitle>
          <CardDescription>{t("submitDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {data.estimateAllowed ? (
            <label className="flex items-start gap-3">
              <Checkbox className="mt-0.5" checked={wantsEstimate} onCheckedChange={(v) => setWantsEstimate(v === true)} />
              <span className="grid gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {t("estimate")} <Badge variant="outline">{common("beta")}</Badge>
                  <CreditCost cost={CREDIT_COSTS.dse_estimate} />
                </span>
                <span className="text-muted-foreground text-xs">{t("estimateHelp")}</span>
              </span>
            </label>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noEstimatePartA")}</p>
          )}
          <div>
            <Button size="lg" onClick={doSubmit} disabled={submit.isPending || save.isPending}>
              {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {t("submit")}
              <CreditCost cost={cost} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Changes the student made to the AI's reading (tracked; shown again with the feedback). */
export function EditList({ edits }: { edits: { at: number; before: string; after: string }[] }) {
  const t = useTranslations("writing.review");
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">{t("edits", { n: edits.length })}</p>
      <div className="flex flex-wrap gap-1.5">
        {edits.slice(0, 60).map((e, i) => (
          <span key={i} className="bg-muted rounded px-1.5 py-0.5 text-xs">
            {e.before ? <del className="text-mark-wrong">{e.before}</del> : <span className="text-muted-foreground">∅</span>}
            {" → "}
            {e.after ? <ins className="text-mark-good no-underline">{e.after}</ins> : <span className="text-muted-foreground">∅</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
