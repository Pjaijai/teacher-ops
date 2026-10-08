"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ENABLED_SUBJECTS, SUBJECTS, type Subject } from "@/lib/subjects";

export function SubjectPicker({ value, onChange }: { value: Subject[]; onChange: (v: Subject[]) => void }) {
  const t = useTranslations("common");
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {SUBJECTS.map((s) => {
        const enabled = ENABLED_SUBJECTS.includes(s);
        return (
          <Label key={s} className="flex items-center gap-2 rounded-md border p-2 font-normal has-disabled:opacity-60">
            <Checkbox
              checked={value.includes(s)}
              disabled={!enabled}
              onCheckedChange={(on) => onChange(on ? [...value, s] : value.filter((x) => x !== s))}
            />
            {t(`subjects.${s}`)}
            {!enabled && <span className="text-muted-foreground ml-auto text-xs">{t("comingSoon")}</span>}
          </Label>
        );
      })}
    </div>
  );
}
