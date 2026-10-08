"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PracticeKind } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import { hasExtension, kindsFor } from "../lib/units";

export type QuestionOptionsValue = { kind: PracticeKind; difficulty: number; extension: boolean };

/** Question type (per subject), difficulty 1–5 and the extension toggle (CP non-foundation topics, Physics `*` content). */
export function QuestionOptions({
  subject,
  value,
  onChange,
  showDifficulty = true,
}: {
  subject: Subject;
  value: QuestionOptionsValue;
  onChange: (v: QuestionOptionsValue) => void;
  showDifficulty?: boolean;
}) {
  const t = useTranslations("practice.options");
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
      <div className="grid gap-1.5">
        <Label className="text-xs">{t("kind")}</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={value.kind}
          onValueChange={(k) => k && onChange({ ...value, kind: k as PracticeKind })}
        >
          {kindsFor(subject).map((k) => (
            <ToggleGroupItem key={k} value={k}>
              {t(`kinds.${k}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {showDifficulty && (
        <div className="grid gap-1.5">
          <Label className="text-xs">{t("difficulty")}</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={String(value.difficulty)}
            onValueChange={(d) => d && onChange({ ...value, difficulty: Number(d) })}
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <ToggleGroupItem key={d} value={String(d)} aria-label={t("difficultyLevel", { level: d })} className="w-9 tabular-nums">
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
      {hasExtension(subject) && (
        <div className="flex items-center gap-2 pb-1.5">
          <Switch id="practice-extension" checked={value.extension} onCheckedChange={(v) => onChange({ ...value, extension: v })} />
          <Label htmlFor="practice-extension" className="text-sm">
            {subject === "physics" ? t("extensionPhysics") : t("extension")}
          </Label>
        </div>
      )}
    </div>
  );
}
