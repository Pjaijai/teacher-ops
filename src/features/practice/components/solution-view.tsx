"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import { KatexText } from "@/components/math/katex-text";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QuestionSolution } from "@/lib/schemas/question";
import { checkToTex, type CodeCheck } from "../lib/code-checks";

export function MarkTypeBadge({ type }: { type: "M" | "A" }) {
  return (
    <Badge variant={type === "M" ? "secondary" : "default"} className="w-7 justify-center font-mono">
      1{type}
    </Badge>
  );
}

const partLabel = (p: string, whole: string) => (p ? `(${p})` : whole);

/** M1/M2 symbolic answers and whether code verified each one (random-point evaluation). */
function CodeChecks({ checks }: { checks: CodeCheck[] }) {
  const t = useTranslations("practice.solution");
  return (
    <section className="grid gap-2">
      <h3 className="font-semibold">{t("codeChecks")}</h3>
      <ul className="grid gap-1.5">
        {checks.map((c, i) => (
          <li key={i} className="flex items-baseline gap-2 text-sm">
            <span className="text-muted-foreground w-12 shrink-0">{partLabel(c.part, t("whole"))}</span>
            <span className="min-w-0 flex-1 overflow-x-auto">
              <KatexText inline>{`$${checkToTex(c)}$`}</KatexText>
            </span>
            {c.ok ? (
              <Badge variant="secondary" className="text-mark-good shrink-0 gap-1" title={c.detail}>
                <CircleCheck className="size-3.5" /> {t("verified")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-mark-wrong shrink-0 gap-1" title={c.detail}>
                <CircleX className="size-3.5" /> {t("notVerified")}
              </Badge>
            )}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">{t("codeChecksNote")}</p>
    </section>
  );
}

/** Answer, marking scheme (M/A, e.c.f.), code-verified symbolic answers, worked solution, 解題 thinking and tips. */
export function SolutionView({ solution }: { solution: QuestionSolution & { codeChecks?: CodeCheck[] } }) {
  const t = useTranslations("practice.solution");
  return (
    <div className="grid gap-6 print:gap-4">
      {solution.answers.length > 0 && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("answers")}</h3>
          <ul className="grid gap-1">
            {solution.answers.map((a, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="text-muted-foreground w-12 shrink-0 text-sm">{partLabel(a.part, t("whole"))}</span>
                <KatexText inline>{a.display}</KatexText>
              </li>
            ))}
          </ul>
        </section>
      )}
      {solution.codeChecks && solution.codeChecks.length > 0 && <CodeChecks checks={solution.codeChecks} />}
      {solution.correctOption && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("key", { option: solution.correctOption })}</h3>
          {solution.distractorNotes.length > 0 && (
            <ul className="grid gap-1.5 text-sm">
              {solution.distractorNotes.map((d) => (
                <li key={d.label} className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {d.label}
                  </Badge>
                  <KatexText className="min-w-0">{d.misconception}</KatexText>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {solution.markingScheme.length > 0 && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("scheme")}</h3>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t("part")}</TableHead>
                  <TableHead className="w-14">{t("mark")}</TableHead>
                  <TableHead>{t("criterion")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solution.markingScheme.flatMap((p) =>
                  p.items.map((it, i) => (
                    <TableRow key={`${p.part}-${i}`}>
                      <TableCell className="align-top text-sm">{i === 0 ? `${partLabel(p.part, t("whole"))} · ${t("marks", { n: p.marks })}` : ""}</TableCell>
                      <TableCell className="align-top">
                        <MarkTypeBadge type={it.type} />
                      </TableCell>
                      <TableCell className="text-sm whitespace-normal">
                        <KatexText>{it.text}</KatexText>
                        {it.ecf && <Badge variant="outline" className="mt-1 text-[0.7rem]">{t("ecf")}</Badge>}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {solution.solution.length > 0 && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("worked")}</h3>
          <ol className="bg-muted/30 grid gap-1 rounded-md border p-3 text-sm">
            {solution.solution.map((s, i) => (
              <li key={i}>
                <KatexText>{s}</KatexText>
              </li>
            ))}
          </ol>
        </section>
      )}

      {solution.taskAnalysis && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("analysis")}</h3>
          <KatexText className="text-sm">{solution.taskAnalysis}</KatexText>
        </section>
      )}

      {solution.tips.length > 0 && (
        <section className="grid gap-2">
          <h3 className="font-semibold">{t("tips")}</h3>
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            {solution.tips.map((tip, i) => (
              <li key={i}>
                <KatexText inline>{tip}</KatexText>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
