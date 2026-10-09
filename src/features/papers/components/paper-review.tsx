"use client";

import { AlertTriangle, Bot, ChevronDown, Loader2, Pencil, Play, Printer, RefreshCw, RotateCcw, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { KatexText } from "@/components/math/katex-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SolutionView } from "@/features/practice/components/solution-view";
import type { LocalPaper, LocalQuestion, PaperSlotRow } from "@/features/local/local-db";
import { Link } from "@/lib/i18n/routing";
import { fillPaper, isSlotBusy, publicOf, reanswerSlot, regenerateSlot, slotKey, startPaper, undoRegenerate } from "../api/local-papers";
import { PaperQuestionBody } from "./paper-question";
import { QuestionEditor } from "./question-editor";

/** Check every question before sitting: preview, edit, regenerate (with an instruction), re-answer after an edit. */
export function PaperReview({ paper, questions }: { paper: LocalPaper; questions: Map<string, LocalQuestion> }) {
  const t = useTranslations("practice.paper");
  const stale = paper.slots.filter((s) => s.answerStale).length;
  const missing = paper.slots.filter((s) => !s.questionId).length;
  const busy = paper.slots.some((s) => isSlotBusy(paper.id, slotKey(s)));

  const start = async () => {
    if (stale > 0 && !window.confirm(t("review.staleConfirm", { count: stale }))) return;
    await startPaper(paper.id);
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("review.title")}</CardTitle>
          <CardDescription>{t("review.hint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={busy || paper.slots.length === missing}>
            <Play className="size-4" /> {t("review.start", { minutes: paper.spec.durationMin })}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/practice/papers/${paper.id}/print`}>
              <Printer className="size-4" /> {t("print")}
            </Link>
          </Button>
          {missing > 0 && (
            <Button variant="ghost" onClick={() => void fillPaper(paper.id, { retryFailed: true })} disabled={busy}>
              <RotateCcw className="size-4" /> {t("review.fillMissing", { count: missing })}
            </Button>
          )}
          {stale > 0 && <span className="text-sm text-amber-600">{t("review.staleCount", { count: stale })}</span>}
        </CardContent>
      </Card>

      {(["A", "B"] as const).map((section) => {
        const slots = paper.slots.filter((s) => s.section === section);
        if (!slots.length) return null;
        return (
          <section key={section} className="grid gap-2">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t(`section${section}`)}</h2>
            {slots.map((s) => (
              <SlotRow key={slotKey(s)} paper={paper} slot={s} question={s.questionId ? questions.get(s.questionId) : undefined} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function SlotRow({ paper, slot, question }: { paper: LocalPaper; slot: PaperSlotRow; question?: LocalQuestion }) {
  const t = useTranslations("practice.paper");
  const key = slotKey(slot);
  const busy = isSlotBusy(paper.id, key);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  const regenerate = () =>
    run(async () => {
      setRegenOpen(false);
      await regenerateSlot(paper.id, key, instruction);
      setInstruction("");
    });

  const view = question ? publicOf(question) : null;
  return (
    <Card className="py-0">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
          <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="w-8 shrink-0 font-mono text-sm font-semibold">{key}</span>
          <span className="min-w-0 truncate text-sm">{question?.title ?? (slot.error ? t("review.failed") : t("review.empty"))}</span>
        </button>
        <Badge variant="outline" className="font-mono">
          {slot.topicIds[0]}
        </Badge>
        {slot.section === "B" && <Badge variant="secondary">{t("marks", { count: slot.marks })}</Badge>}
        {question && question.checkProblems.length > 0 && (
          <Badge variant="outline" className="border-amber-500 text-amber-600" title={question.checkProblems.join("\n")}>
            <AlertTriangle className="size-3" /> {t("review.check")}
          </Badge>
        )}
        {slot.answerStale && <Badge className="bg-amber-500">{t("review.stale")}</Badge>}
        {busy && <Loader2 className="size-4 animate-spin" />}
      </div>

      {open && (
        <CardContent className="grid gap-4 border-t pt-4 pb-4">
          {slot.error && !question && <p className="text-destructive text-sm">{slot.error}</p>}
          {question && view && (
            <>
              {slot.answerStale && (
                <Alert className="border-amber-500">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    {t("review.staleBanner")}
                    <Button size="sm" onClick={() => run(() => reanswerSlot(paper.id, key))} disabled={busy}>
                      <Bot className="size-4" /> {t("review.reanswer")}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <PaperQuestionBody question={question} />
              {question.kind === "mc" && (
                <ol className="grid gap-1 text-sm sm:grid-cols-2">
                  {question.content.options.map((o) => (
                    <li key={o.label} className={o.label === question.content.correctOption ? "font-medium" : ""}>
                      <OptionText label={o.label} text={o.text} />
                    </li>
                  ))}
                </ol>
              )}
              {question.checkProblems.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-amber-700">
                  {question.checkProblems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {question && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy}>
                <Pencil className="size-4" /> {t("review.edit")}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setRegenOpen(!regenOpen)} disabled={busy}>
              <RefreshCw className="size-4" /> {t("review.regenerate")}
            </Button>
            {question && !slot.answerStale && (
              <Button size="sm" variant="ghost" onClick={() => run(() => reanswerSlot(paper.id, key))} disabled={busy}>
                <Bot className="size-4" /> {t("review.reanswer")}
              </Button>
            )}
            {slot.previousQuestionIds.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => run(() => undoRegenerate(paper.id, key))} disabled={busy}>
                <Undo2 className="size-4" /> {t("review.undo")}
              </Button>
            )}
            {question && (
              <Button size="sm" variant="ghost" onClick={() => setShowAnswer(!showAnswer)}>
                {showAnswer ? t("review.hideAnswer") : t("review.showAnswer")}
              </Button>
            )}
          </div>

          {regenOpen && (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void regenerate();
              }}
            >
              <Input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                maxLength={300}
                placeholder={t("review.regenPlaceholder")}
                className="min-w-60 flex-1"
                autoFocus
              />
              <Button size="sm" type="submit">
                {t("review.regenGo")}
              </Button>
            </form>
          )}

          {showAnswer && view && <SolutionView solution={view.solution} />}
        </CardContent>
      )}

      {question && editing && <QuestionEditor paperId={paper.id} slotKey={key} question={question} open={editing} onOpenChange={setEditing} />}
    </Card>
  );
}


function OptionText({ label, text }: { label: string; text: string }) {
  return (
    <span className="flex gap-2">
      <span className="font-semibold">{label}.</span>
      <KatexText>{text}</KatexText>
    </span>
  );
}
