"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { HelperKind } from "@/lib/schemas/writing";
import type { HelperContent as Content } from "@/server/ai/prompts/writing-helpers";

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-1">
      <p className="text-sm font-medium">{title}</p>
      <ul className="text-muted-foreground list-disc space-y-0.5 pl-5 text-sm">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

/** Renders one cached helper result. */
export function HelperContent({ kind, content }: { kind: HelperKind; content: unknown }) {
  const t = useTranslations("writing.helpers.fields");
  switch (kind) {
    case "task_analysis": {
      const c = content as Content["task_analysis"];
      return (
        <div className="grid gap-3">
          <Row label={t("asks")} value={c.asks} />
          <Row label={t("textType")} value={c.textType} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label={t("audience")} value={c.audience} />
            <Row label={t("purpose")} value={c.purpose} />
          </div>
          <Row label={t("toneRegister")} value={c.toneRegister} />
          <Section title={t("keyRequirements")} items={c.keyRequirements} />
          <Section title={t("traps")} items={c.traps} />
          <Section title={t("prepare")} items={c.prepare} />
        </div>
      );
    }
    case "outline": {
      const c = content as Content["outline"];
      return (
        <div className="grid gap-3">
          <Row label={t("centralIdea")} value={c.centralIdea} />
          <ol className="grid gap-2">
            {c.paragraphs.map((p, i) => (
              <li key={i} className="rounded-md border p-3">
                <p className="mb-1 text-sm font-medium">
                  {i + 1}. {p.role}
                </p>
                <ul className="text-muted-foreground list-disc space-y-0.5 pl-5 text-sm">
                  {p.points.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <Section title={t("tips")} items={c.tips} />
        </div>
      );
    }
    case "vocabulary": {
      const c = content as Content["vocabulary"];
      return (
        <div className="grid gap-4">
          {c.groups.map((g, i) => (
            <div key={i} className="grid gap-2">
              <p className="text-sm font-medium">{g.theme}</p>
              {g.items.map((w, j) => (
                <div key={j} className="rounded-md border p-2.5">
                  <p className="font-medium">
                    {w.word} <span className="text-muted-foreground text-sm font-normal">— {w.meaning}</span>
                  </p>
                  {w.synonyms.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {w.synonyms.map((s) => (
                        <Badge key={s} variant="secondary" className="font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {w.note && <p className="text-muted-foreground mt-1 text-xs">{w.note}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    case "sentence_patterns": {
      const c = content as Content["sentence_patterns"];
      return (
        <div className="grid gap-2">
          {c.patterns.map((p, i) => (
            <div key={i} className="rounded-md border p-2.5">
              <p className="font-medium">{p.pattern}</p>
              <p className="text-muted-foreground text-sm">{p.use}</p>
              <p className="border-primary/40 mt-1.5 border-l-2 pl-2 text-sm italic">{p.example}</p>
            </div>
          ))}
        </div>
      );
    }
    case "idioms": {
      const c = content as Content["idioms"];
      return (
        <div className="grid gap-2">
          {c.items.map((p, i) => (
            <div key={i} className="rounded-md border p-2.5">
              <p className="font-medium">
                {p.idiom} <span className="text-muted-foreground text-sm font-normal">— {p.meaning}</span>
              </p>
              <p className="text-muted-foreground text-sm">{p.usage}</p>
              <p className="border-primary/40 mt-1.5 border-l-2 pl-2 text-sm italic">{p.example}</p>
            </div>
          ))}
        </div>
      );
    }
  }
}
