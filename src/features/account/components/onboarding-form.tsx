"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRouter } from "@/lib/i18n/routing";
import type { Subject } from "@/lib/subjects";
import { useMe, useUpdateProfile } from "../api/use-me";
import { SubjectPicker } from "./subject-picker";

export function OnboardingForm() {
  const t = useTranslations("account.onboarding");
  const router = useRouter();
  const me = useMe();
  const update = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [form, setForm] = useState<string>("5");
  const [subjects, setSubjects] = useState<Subject[]>(["chi_writing", "eng_writing", "math_cp"]);
  const [examLanguage, setExamLanguage] = useState<"zh" | "en">("en");

  useEffect(() => {
    if (me.data && !me.data.user) router.replace("/sign-in");
    if (me.data?.profile) setDisplayName((n) => n || me.data!.profile!.displayName);
  }, [me.data, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({ displayName, form: Number(form), subjects, examLanguage, onboarded: true });
    router.replace("/dashboard");
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("displayName")}</Label>
            <Input id="name" required maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("form")}</Label>
            <ToggleGroup type="single" variant="outline" value={form} onValueChange={(v) => v && setForm(v)} className="justify-start">
              {["4", "5", "6"].map((f) => (
                <ToggleGroupItem key={f} value={f}>
                  S{f}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="grid gap-2">
            <Label>{t("subjects")}</Label>
            <SubjectPicker value={subjects} onChange={setSubjects} />
          </div>
          <div className="grid gap-2">
            <Label>{t("examLanguage")}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={examLanguage}
              onValueChange={(v) => v && setExamLanguage(v as "zh" | "en")}
              className="justify-start"
            >
              <ToggleGroupItem value="en">{t("examLanguageEn")}</ToggleGroupItem>
              <ToggleGroupItem value="zh">{t("examLanguageZh")}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button type="submit" disabled={update.isPending || subjects.length === 0}>
            {t("continue")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
