"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Subject } from "@/lib/subjects";
import { subtopicsOf, topicOfSubtopic } from "@/lib/topic-tree";
import { cn } from "@/lib/utils";
import { useTopics, type TopicRow } from "../api/use-practice-question";
import { PRACTISABLE, STRAND_KEYS, strandOf } from "../lib/units";

export function topicName(t: Pick<TopicRow, "nameEn" | "nameZh">, locale: string) {
  return locale === "zh-HK" ? t.nameZh : t.nameEn;
}

/** Pickable rows: Learning Units for maths; for subjects without units (Physics), the leaf topics. */
function pickable(rows: TopicRow[]) {
  const units = rows.filter((r) => r.kind === "unit");
  if (units.length > 0) return units.filter((u) => PRACTISABLE(u.id));
  const parents = new Set(rows.map((r) => r.parentId).filter(Boolean));
  const leaves = rows.filter((r) => !parents.has(r.id));
  return (leaves.length > 0 ? leaves : rows).filter((r) => PRACTISABLE(r.id));
}

/** Group heading of a row: its strand, else its parent topic's name, else none. */
function groupOf(row: TopicRow, byId: Map<string, TopicRow>, locale: string): { key: string; strand?: string; label?: string } {
  const strand = row.strand ?? strandOf(row.id);
  if (strand) return { key: strand, strand };
  const parent = row.parentId ? byId.get(row.parentId) : undefined;
  if (parent) return { key: parent.id, label: `${parent.id} ${topicName(parent, locale)}` };
  return { key: "", label: "" };
}

/**
 * Learning Units (or topics) grouped by strand; pick up to `max`. Foundation status shown as a badge.
 * Physics topics also offer their subtopics (syllabus objectives): `value` then holds the subtopic ids too,
 * and a topic with subtopics picked is narrowed to them.
 */
export function TopicTreePicker({
  subject,
  value,
  onChange,
  max = 3,
}: {
  subject: Subject;
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}) {
  const t = useTranslations("practice.topics");
  const locale = useLocale();
  const topics = useTopics(subject);

  if (topics.isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = topics.data?.items ?? [];
  const units = pickable(rows);
  if (units.length === 0) return <p className="text-muted-foreground text-sm">{t("none")}</p>;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups: { key: string; heading: string; items: TopicRow[] }[] = [];
  for (const u of units) {
    const g = groupOf(u, byId, locale);
    let group = groups.find((x) => x.key === g.key);
    if (!group) {
      const key = g.strand ? STRAND_KEYS[g.strand] : undefined;
      const heading = g.strand ? (key ? t(`strands.${key}`) : g.strand) : (g.label ?? "");
      group = { key: g.key, heading, items: [] };
      groups.push(group);
    }
    group.items.push(u);
  }

  const picked = value.filter((v) => topicOfSubtopic(v) === v);
  const toggle = (id: string) => {
    if (picked.includes(id)) onChange(value.filter((v) => topicOfSubtopic(v) !== id));
    else if (picked.length < max) onChange([...value, id]);
    else onChange([...value.filter((v) => topicOfSubtopic(v) !== picked[0]), id]);
  };
  const toggleSub = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const withSubtopics = picked.map((id) => ({ topic: byId.get(id), subs: subtopicsOf(id) })).filter((x) => x.topic && x.subs.length > 1);

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-xs">{t("hint", { max })}</p>
      {groups.map(({ key, heading, items: inStrand }) => {
        return (
          <section key={key || "all"} className="grid gap-2">
            {heading && <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{heading}</h3>}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {inStrand.map((u) => {
                const selected = value.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.id)}
                    aria-pressed={selected}
                    className={cn(
                      "hover:bg-muted flex items-start gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
                      selected && "border-primary bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                        selected && "bg-primary border-primary text-primary-foreground",
                      )}
                    >
                      {selected && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-muted-foreground mr-1.5 font-mono text-xs">{u.id}</span>
                      {topicName(u, locale)}
                    </span>
                    {u.foundation === "FT" && <Badge variant="secondary" className="shrink-0">{t("foundation")}</Badge>}
                    {u.foundation === "NFT" && <Badge variant="outline" className="shrink-0">{t("nonFoundation")}</Badge>}
                    {u.foundation === "mixed" && <Badge variant="outline" className="shrink-0 opacity-70">{t("mixed")}</Badge>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {withSubtopics.length > 0 && (
        <section className="bg-muted/40 grid gap-3 rounded-md border p-3">
          <p className="text-muted-foreground text-xs">{t("subtopicsHint")}</p>
          {withSubtopics.map(({ topic, subs }) => (
            <div key={topic!.id} className="grid gap-1.5">
              <h3 className="text-xs font-semibold">
                <span className="text-muted-foreground mr-1.5 font-mono">{topic!.id}</span>
                {topicName(topic!, locale)}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {subs.map((s) => {
                  const on = value.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSub(s.id)}
                      aria-pressed={on}
                      title={s.textEn}
                      className={cn(
                        "hover:bg-muted max-w-full rounded-md border px-2 py-1 text-left text-xs transition-colors",
                        on && "border-primary bg-primary/5",
                      )}
                    >
                      <span className="text-muted-foreground mr-1 font-mono">{s.id.slice(topic!.id.length)}</span>
                      {s.textEn.split(/[:;]/)[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
