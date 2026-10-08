"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMe } from "@/features/account/api/use-me";
import { PRACTICE_SUBJECTS, type Subject } from "@/lib/subjects";
import { isPracticeSubject } from "../lib/units";
import { GeneratePanel } from "./generate-panel";
import { RecentAttempts } from "./recent-attempts";

const STORAGE_KEY = "practice.subject";

function readStored(): Subject | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && isPracticeSubject(v) ? v : null;
  } catch {
    return null;
  }
}

function store(s: Subject) {
  try {
    window.localStorage.setItem(STORAGE_KEY, s);
  } catch {
    // private mode / blocked storage: the choice just isn't remembered
  }
}

/** /practice: subject switcher, generate (by topic / by type / from a reference) and recent attempts. */
export function PracticeHome() {
  const t = useTranslations("practice");
  const tc = useTranslations("common");
  const me = useMe();

  /** The student's practice subjects from their profile; all of them if the profile names none. */
  const subjects = useMemo<Subject[]>(() => {
    const mine = (me.data?.profile?.subjects ?? []).filter((s: string) => isPracticeSubject(s)) as Subject[];
    const ordered = PRACTICE_SUBJECTS.filter((s) => mine.includes(s));
    return ordered.length ? ordered : [...PRACTICE_SUBJECTS];
  }, [me.data?.profile?.subjects]);

  const [chosen, setChosen] = useState<Subject | null>(null);
  useEffect(() => setChosen(readStored()), []);
  const subject: Subject = chosen && subjects.includes(chosen) ? chosen : subjects[0];

  const pick = (s: string) => {
    if (!s || !isPracticeSubject(s)) return;
    setChosen(s);
    store(s);
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      {subjects.length > 1 && (
        <div className="grid gap-1.5">
          <span className="text-muted-foreground text-xs" id="practice-subject-label">
            {t("subject")}
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            value={subject}
            onValueChange={pick}
            aria-labelledby="practice-subject-label"
            className="flex-wrap justify-start"
          >
            {subjects.map((s) => (
              <ToggleGroupItem key={s} value={s} className="px-3">
                {tc(`subjects.${s}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {me.isLoading ? <div /> : <GeneratePanel key={subject} subject={subject} />}
        <RecentAttempts />
      </div>
    </div>
  );
}
