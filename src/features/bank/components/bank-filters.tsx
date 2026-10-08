"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ENABLED_SUBJECTS } from "@/lib/subjects";
import { useTopics, type BankFilters } from "../api/use-bank-search";

const ANY = "__any__";

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
}) {
  const t = useTranslations("bank");
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <Select
        value={value ?? ANY}
        onValueChange={(v) => onChange(v === ANY ? undefined : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t("any")}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BankFilterPanel({
  filters,
  onChange,
}: {
  filters: BankFilters;
  onChange: (patch: Partial<BankFilters>) => void;
}) {
  const t = useTranslations("bank");
  const tc = useTranslations("common");
  const locale = useLocale();
  const topics = useTopics(filters.subject);
  const name = (n: { nameEn: string; nameZh: string }) =>
    locale === "en" ? n.nameEn : n.nameZh;

  const groups = useMemo(() => {
    const items = topics.data?.items ?? [];
    const children = items.filter((i) => i.parentId);
    const roots = items.filter((i) => !i.parentId);
    const out: { id: string; title: string; topics: typeof items }[] = [];
    for (const r of roots) {
      const kids = children.filter((c) => c.parentId === r.id);
      if (kids.length) out.push({ id: r.id, title: name(r), topics: kids });
    }
    const flat = roots.filter(
      (r) => !children.some((c) => c.parentId === r.id),
    );
    if (flat.length)
      out.push({ id: "_flat", title: t("topics"), topics: flat });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.data, locale]);

  const toggleTopic = (id: string, on: boolean) =>
    onChange({
      topic: on
        ? [...filters.topic, id]
        : filters.topic.filter((x) => x !== id),
    });

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label={t("subject")}
          value={filters.subject}
          onChange={(subject) => onChange({ subject, topic: [] })}
          options={ENABLED_SUBJECTS.map((s) => ({
            value: s,
            label: tc(`subjects.${s}`),
          }))}
        />
        <Field
          label={t("kind")}
          value={filters.kind}
          onChange={(kind) => onChange({ kind })}
          options={(
            ["writing_task", "mc", "short", "long", "experiment"] as const
          ).map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
        />
        <Field
          label={t("difficulty")}
          value={filters.difficulty}
          onChange={(difficulty) => onChange({ difficulty })}
          options={[1, 2, 3, 4, 5].map((n) => ({
            value: String(n),
            label: t("difficultyN", { n }),
          }))}
        />
        <Field
          label={t("extension")}
          value={filters.extension}
          onChange={(extension) => onChange({ extension })}
          options={[
            { value: "true", label: t("extensionOnly") },
            { value: "false", label: t("coreOnly") },
          ]}
        />
        <Field
          label={t("language")}
          value={filters.language}
          onChange={(language) => onChange({ language })}
          options={[
            { value: "zh", label: "中文" },
            { value: "en", label: "English" },
          ]}
        />
        <Field
          label={t("sort")}
          value={filters.sort}
          onChange={(sort) => onChange({ sort })}
          options={(["relevance", "rating", "new"] as const).map((s) => ({
            value: s,
            label: t(`sorts.${s}`),
          }))}
        />
      </div>

      <Label className="font-normal">
        <Checkbox
          checked={filters.unattempted === "true"}
          onCheckedChange={(on) =>
            onChange({ unattempted: on ? "true" : undefined })
          }
        />
        {t("unattemptedOnly")}
      </Label>

      <div className="grid gap-2">
        <Label className="text-muted-foreground text-xs">{t("topics")}</Label>
        {!filters.subject ? (
          <p className="text-muted-foreground text-sm">
            {t("pickSubjectForTopics")}
          </p>
        ) : topics.isLoading ? (
          <p className="text-muted-foreground text-sm">{tc("loading")}</p>
        ) : (
          <div className="grid gap-1">
            {groups.map((g) => (
              <details
                key={g.id}
                className="rounded-md border px-3 py-1.5"
                open={g.topics.some((x) => filters.topic.includes(x.id))}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {g.title}
                </summary>
                <div className="grid gap-1.5 py-2 sm:grid-cols-2">
                  {g.topics.map((x) => (
                    <Label key={x.id} className="items-start font-normal">
                      <Checkbox
                        checked={filters.topic.includes(x.id)}
                        onCheckedChange={(on) => toggleTopic(x.id, Boolean(on))}
                      />
                      <span>
                        <span className="text-muted-foreground mr-1 text-xs">
                          {x.id}
                        </span>
                        {name(x)}
                      </span>
                    </Label>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
