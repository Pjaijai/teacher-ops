"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { KatexText } from "@/components/math/katex-text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SolutionView } from "@/features/practice/components/solution-view";
import { Link } from "@/lib/i18n/routing";
import { publicOf } from "../api/local-papers";
import { usePaper } from "../api/use-paper";
import { PaperQuestionBody } from "./paper-question";

/** Print layout: cover, Section A with an answer grid, Section B with answer space — or the marking scheme. */
export function PaperPrint({ paperId }: { paperId: string }) {
  const t = useTranslations("practice.paper");
  const data = usePaper(paperId);
  const [scheme, setScheme] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("scheme") === "1") setScheme(true);
  }, []);

  if (data.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data.data) return <p className="text-destructive">{t("notFound")}</p>;
  const { paper, questions } = data.data;
  const slots = paper.slots.filter((s) => s.questionId && questions.has(s.questionId));
  const a = slots.filter((s) => s.section === "A");
  const b = slots.filter((s) => s.section === "B");

  return (
    <div className="mx-auto grid max-w-3xl gap-8 print:max-w-none print:gap-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/practice/papers/${paper.id}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> {t("backToPaper")}
        </Link>
        <Label className="ml-auto flex items-center gap-2 font-normal">
          {t("printSchemeToggle")}
          <Switch checked={scheme} onCheckedChange={setScheme} />
        </Label>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> {t("print")}
        </Button>
      </div>

      <header className="grid gap-1 border-b pb-4 text-center">
        <h1 className="text-2xl font-semibold">{t("printTitle")}</h1>
        <p>
          {t(`presets.${paper.spec.preset}`)}
          {scheme ? ` — ${t("schemeTitle")}` : ""}
        </p>
        {!scheme && (
          <p className="text-muted-foreground text-sm">
            {t("printTime", { minutes: paper.spec.durationMin })}
            {b.length > 0 ? ` · ${t("sectionB")}: ${t("marks", { count: b.reduce((s, x) => s + x.marks, 0) })}` : ""}
          </p>
        )}
      </header>

      {a.length > 0 && (
        <section className="grid gap-6">
          <h2 className="text-lg font-semibold">{t("sectionA")}</h2>
          {a.map((s) => {
            const q = questions.get(s.questionId!)!;
            return (
              <div key={`A${s.n}`} className="grid gap-2 break-inside-avoid">
                <div className="flex gap-3">
                  <span className="font-semibold">{s.n}.</span>
                  <div className="grid flex-1 gap-2">
                    <PaperQuestionBody question={q} compact />
                    <ol className="grid gap-1 text-sm">
                      {q.content.options.map((o) => (
                        <li key={o.label} className="flex gap-2">
                          <span className="font-semibold">{o.label}.</span>
                          <KatexText>{o.text}</KatexText>
                        </li>
                      ))}
                    </ol>
                    {scheme && (
                      <p className="text-sm">
                        <span className="font-semibold">{t("key")}: {q.content.correctOption}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!scheme && (
            <div className="break-inside-avoid break-before-page">
              <h3 className="mb-3 font-semibold">{t("answerSheet")}</h3>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
                {a.map((s) => (
                  <div key={s.n} className="flex items-center gap-2">
                    <span className="w-6 text-right font-mono">{s.n}</span>
                    {["A", "B", "C", "D"].map((l) => (
                      <span key={l} className="flex size-5 items-center justify-center rounded-full border text-[0.6rem]">
                        {l}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {b.length > 0 && (
        <section className={`grid gap-8 ${a.length > 0 ? "break-before-page" : ""}`}>
          <h2 className="text-lg font-semibold">{t("sectionB")}</h2>
          {b.map((s) => {
            const q = questions.get(s.questionId!)!;
            return (
              <div key={`B${s.n}`} className="grid gap-3">
                <div className="flex gap-3">
                  <span className="font-semibold">{s.n}.</span>
                  <div className="grid flex-1 gap-2">
                    <PaperQuestionBody question={q} />
                    <span className="text-muted-foreground text-right text-xs">({t("marks", { count: s.marks })})</span>
                  </div>
                </div>
                {scheme ? (
                  <SolutionView solution={publicOf(q).solution} />
                ) : (
                  <div className="grid gap-6 print:gap-7" aria-hidden>
                    {Array.from({ length: Math.max(6, s.marks * 2) }, (_, i) => (
                      <div key={i} className="border-b border-dotted" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
