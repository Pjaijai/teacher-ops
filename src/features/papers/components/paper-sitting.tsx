"use client";

import { ChevronLeft, ChevronRight, Clock, Flag, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { McOptions } from "@/features/practice/components/mc-options";
import type { LocalPaper, LocalQuestion } from "@/features/local/local-db";
import { cn } from "@/lib/utils";
import { answerSlot, flagSlot, secondsLeft, slotKey, submitPaper } from "../api/local-papers";
import { PaperQuestionBody } from "./paper-question";

const clock = (s: number) => {
  const v = Math.max(0, s);
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  const sec = v % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
};

/** The exam: countdown (survives reloads), navigator, one question at a time. MC answers aren't marked until hand-in. */
export function PaperSitting({ paper, questions }: { paper: LocalPaper; questions: Map<string, LocalQuestion> }) {
  const t = useTranslations("practice.paper");
  const slots = paper.slots.filter((s) => s.questionId);
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(() => secondsLeft(paper));
  const submitted = useRef(false);

  const handIn = async () => {
    if (submitted.current) return;
    submitted.current = true;
    await submitPaper(paper.id);
  };

  useEffect(() => {
    const id = window.setInterval(() => setLeft(secondsLeft(paper)), 1000);
    return () => window.clearInterval(id);
  }, [paper]);
  useEffect(() => {
    if (left <= 0) void handIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hand in once when time runs out
  }, [left <= 0]);

  const slot = slots[Math.min(index, slots.length - 1)];
  if (!slot) return null;
  const q = questions.get(slot.questionId!);
  const key = slotKey(slot);
  const answered = slots.filter((s) => s.section === "A" && s.mcChoice).length;
  const mcTotal = slots.filter((s) => s.section === "A").length;

  const confirmHandIn = () => {
    const blank = mcTotal - answered;
    if (window.confirm(blank > 0 ? t("sitting.confirmBlank", { count: blank }) : t("sitting.confirm"))) void handIn();
  };

  return (
    <div className="grid gap-4">
      <div className="bg-background/95 sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b py-2 backdrop-blur">
        <span className={cn("flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums", left < 300 && "text-destructive")}>
          <Clock className="size-4" /> {clock(left)}
        </span>
        {mcTotal > 0 && <span className="text-muted-foreground text-sm">{t("sitting.answered", { done: answered, total: mcTotal })}</span>}
        <Button className="ml-auto" size="sm" onClick={confirmHandIn}>
          <Send className="size-4" /> {t("sitting.handIn")}
        </Button>
      </div>

      <nav className="grid gap-2" aria-label={t("sitting.navigator")}>
        {(["A", "B"] as const).map((section) => {
          const list = slots.filter((s) => s.section === section);
          if (!list.length) return null;
          return (
            <div key={section} className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground mr-1 w-6 text-xs font-semibold">{section}</span>
              {list.map((s) => {
                const i = slots.indexOf(s);
                return (
                  <button
                    key={slotKey(s)}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={i === index}
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded border text-xs",
                      s.mcChoice && "bg-primary/10 border-primary",
                      i === index && "ring-primary ring-2",
                    )}
                  >
                    {s.n}
                    {s.flagged && <Flag className="absolute -top-1 -right-1 size-3 fill-amber-500 text-amber-500" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="flex items-center gap-2">
            <h2 className="mr-auto font-semibold">
              {t(`section${slot.section}`)} · {t("sitting.question", { n: slot.n })}
              {slot.section === "B" && <span className="text-muted-foreground ml-2 text-sm font-normal">({t("marks", { count: slot.marks })})</span>}
            </h2>
            <Button size="sm" variant={slot.flagged ? "secondary" : "ghost"} onClick={() => void flagSlot(paper.id, key, !slot.flagged)}>
              <Flag className="size-4" /> {slot.flagged ? t("sitting.unflag") : t("sitting.flag")}
            </Button>
          </div>
          {q && <PaperQuestionBody question={q} />}
          {q && slot.section === "A" && (
            <McOptions
              options={q.content.options}
              outcome={null}
              selected={slot.mcChoice}
              onChoose={(label) => void answerSlot(paper.id, key, label)}
            />
          )}
          {slot.section === "B" && <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">{t("sitting.writeOnPaper")}</p>}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)} disabled={index === 0}>
              <ChevronLeft className="size-4" /> {t("sitting.prev")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIndex(index + 1)} disabled={index >= slots.length - 1}>
              {t("sitting.next")} <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
