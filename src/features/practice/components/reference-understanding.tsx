"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DiagramView } from "@/components/diagrams/diagram-view";
import { KatexText } from "@/components/math/katex-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DiagramSchema } from "@/lib/schemas/diagram";
import type { Understanding } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import { TopicTreePicker } from "./topic-tree-picker";

/** "Here's what I understood": every field editable before generating variants. */
export function ReferenceUnderstandingForm({
  subject,
  value,
  onChange,
  figureProblems = [],
}: {
  subject: Subject;
  value: Understanding;
  onChange: (u: Understanding) => void;
  figureProblems?: string[];
}) {
  const t = useTranslations("practice.reference");
  const [figureJson, setFigureJson] = useState(() => (value.figure ? JSON.stringify(value.figure, null, 2) : ""));
  const [figureError, setFigureError] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(false);

  useEffect(() => {
    setFigureJson(value.figure ? JSON.stringify(value.figure, null, 2) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a new understanding arrives
  }, [value.questionText]);

  const editFigure = (text: string) => {
    setFigureJson(text);
    if (!text.trim()) {
      setFigureError(null);
      onChange({ ...value, figure: null });
      return;
    }
    try {
      const parsed = DiagramSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        setFigureError(t("figureInvalid"));
        return;
      }
      setFigureError(null);
      onChange({ ...value, figure: parsed.data });
    } catch {
      setFigureError(t("figureInvalidJson"));
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ref-text">{t("questionText")}</Label>
          <Textarea
            id="ref-text"
            className="min-h-40 font-mono text-xs"
            value={value.questionText}
            onChange={(e) => onChange({ ...value, questionText: e.target.value })}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <Label>{t("preview")}</Label>
          <div className="bg-muted/30 rounded-md border p-3 text-sm">
            <KatexText>{value.questionText}</KatexText>
            <DiagramView figure={value.figure} graph={value.graph} physicsFigure={value.physicsFigure ?? null} compact />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ref-topic">{t("topic")}</Label>
          <Input id="ref-topic" value={value.topic} onChange={(e) => onChange({ ...value, topic: e.target.value })} />
          <p className="text-muted-foreground text-xs">
            {value.topicIds.length ? value.topicIds.join(", ") : t("noUnits")} ·{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => setShowTopics((s) => !s)}>
              {t("changeUnits")}
            </button>
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ref-key">{t("keyIdea")}</Label>
          <Textarea id="ref-key" className="min-h-16" value={value.keyIdea} onChange={(e) => onChange({ ...value, keyIdea: e.target.value })} />
        </div>
      </div>
      {showTopics && <TopicTreePicker subject={subject} value={value.topicIds} onChange={(topicIds) => onChange({ ...value, topicIds })} max={2} />}

      {!value.figureSupported && value.figureNote && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>{t("figureUnsupported", { note: value.figureNote })}</AlertDescription>
        </Alert>
      )}
      {figureProblems.length > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>{t("figureProblems", { problems: figureProblems.join("; ") })}</AlertDescription>
        </Alert>
      )}

      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer font-medium">{t("figureJson")}</summary>
        <p className="text-muted-foreground mt-2 text-xs">{t("figureJsonHint")}</p>
        <Textarea className="mt-2 min-h-48 font-mono text-xs" value={figureJson} onChange={(e) => editFigure(e.target.value)} />
        {figureError && <p className="text-destructive mt-1 text-xs">{figureError}</p>}
      </details>
    </div>
  );
}
