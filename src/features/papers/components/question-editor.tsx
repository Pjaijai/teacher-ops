"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { KatexText } from "@/components/math/katex-text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LocalQuestion } from "@/features/local/local-db";
import type { QuestionContent } from "@/lib/schemas/question";
import { saveQuestionEdit } from "../api/local-papers";
import { PaperQuestionBody } from "./paper-question";

const LABELS = ["A", "B", "C", "D"] as const;

/** Edit the question side (stem, MC options and key, keep/remove figure) with a live preview. */
export function QuestionEditor({
  paperId,
  slotKey,
  question,
  open,
  onOpenChange,
}: {
  paperId: string;
  slotKey: string;
  question: LocalQuestion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("practice.paper.edit");
  const isMc = question.kind === "mc";
  const [stem, setStem] = useState(question.content.stem);
  const [options, setOptions] = useState<QuestionContent["options"]>(
    isMc ? LABELS.map((label) => question.content.options.find((o) => o.label === label) ?? { label, text: "" }) : [],
  );
  const [key, setKey] = useState<QuestionContent["correctOption"]>(question.content.correctOption);
  const [removeFigure, setRemoveFigure] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasFigure = Boolean(question.content.physicsFigure || question.content.graph);

  const preview: LocalQuestion = {
    ...question,
    content: { ...question.content, stem, options, physicsFigure: removeFigure ? null : question.content.physicsFigure, graph: removeFigure ? null : question.content.graph },
  };

  const save = async () => {
    if (!stem.trim() || (isMc && options.some((o) => !o.text.trim()))) {
      toast.error(t("incomplete"));
      return;
    }
    setSaving(true);
    try {
      await saveQuestionEdit(paperId, slotKey, { stem, options, correctOption: key, removeFigure });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("title", { n: slotKey })}</DialogTitle>
          <DialogDescription>{t("hint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid content-start gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-stem">{t("stem")}</Label>
              <Textarea id="edit-stem" rows={10} value={stem} onChange={(e) => setStem(e.target.value)} className="font-mono text-xs" />
            </div>
            {isMc && (
              <div className="grid gap-2">
                <Label>{t("options")}</Label>
                {options.map((o, i) => (
                  <div key={o.label} className="flex items-center gap-2">
                    <span className="w-4 text-sm font-semibold">{o.label}</span>
                    <Input
                      value={o.text}
                      onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                      className="font-mono text-xs"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <Label className="text-xs">{t("key")}</Label>
                  <ToggleGroup type="single" variant="outline" value={key ?? ""} onValueChange={(v) => v && setKey(v as typeof key)}>
                    {LABELS.map((l) => (
                      <ToggleGroupItem key={l} value={l} className="w-9">
                        {l}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <p className="text-muted-foreground text-xs">{t("keyHint")}</p>
              </div>
            )}
            {hasFigure && (
              <Label className="flex items-center justify-between gap-3 font-normal">
                {t("removeFigure")}
                <Switch checked={removeFigure} onCheckedChange={setRemoveFigure} />
              </Label>
            )}
          </div>
          <div className="grid content-start gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("preview")}</span>
            <div className="rounded-md border p-3">
              <PaperQuestionBody question={preview} compact />
              {isMc && (
                <ol className="mt-3 grid gap-1 text-sm">
                  {options.map((o) => (
                    <li key={o.label} className="flex gap-2">
                      <span className="font-semibold">{o.label}.</span>
                      <KatexText>{o.text}</KatexText>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
