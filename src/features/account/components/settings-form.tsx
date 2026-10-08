"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiClientError } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { exportBackup, importBackup } from "@/features/local/backup";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/lib/i18n/routing";
import type { Subject } from "@/lib/subjects";
import { useCreditHistory, useDeleteAccount, useMe, useUpdateProfile } from "../api/use-me";
import { SubjectPicker } from "./subject-picker";

export function SettingsForm() {
  const t = useTranslations("account");
  const common = useTranslations("common");
  const me = useMe();
  const update = useUpdateProfile();
  const history = useCreditHistory();
  const del = useDeleteAccount();
  const router = useRouter();
  const qc = useQueryClient();
  const profile = me.data?.profile;

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examLanguage, setExamLanguage] = useState<"zh" | "en">("en");
  const [extensionTrack, setExtensionTrack] = useState(true);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setNickname(profile.nickname ?? "");
    setSubjects(profile.subjects);
    setExamLanguage(profile.examLanguage);
    setExtensionTrack(profile.extensionTrack);
  }, [profile]);

  const save = async () => {
    try {
      await update.mutateAsync({ displayName, ...(isLocalMode ? {} : { nickname: nickname.trim() || null }), subjects, examLanguage, extensionTrack });
      toast.success(t("settings.saved"));
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : common("error"));
    }
  };

  if (!profile) return null;
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("onboarding.displayName")}</Label>
            <Input id="name" value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          {!isLocalMode && <div className="grid gap-2">
            <Label htmlFor="nick">{t("settings.nickname")}</Label>
            <Input id="nick" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
            <p className="text-muted-foreground text-xs">{t("settings.nicknameHelp")}</p>
          </div>}
          <div className="grid gap-2">
            <Label>{t("onboarding.subjects")}</Label>
            <SubjectPicker value={subjects} onChange={setSubjects} />
          </div>
          <div className="grid gap-2">
            <Label>{t("onboarding.examLanguage")}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={examLanguage}
              onValueChange={(v) => v && setExamLanguage(v as "zh" | "en")}
              className="justify-start"
            >
              <ToggleGroupItem value="en">{t("onboarding.examLanguageEn")}</ToggleGroupItem>
              <ToggleGroupItem value="zh">{t("onboarding.examLanguageZh")}</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Label className="flex items-center gap-3 font-normal">
            <Switch checked={extensionTrack} onCheckedChange={setExtensionTrack} />
            {t("settings.extensionTrack")}
          </Label>
          <Button onClick={save} disabled={update.isPending} className="w-fit">
            {common("save")}
          </Button>
        </CardContent>
      </Card>

      {isLocalMode ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.localData")}</CardTitle>
            <CardDescription>{t("settings.localDataBody")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const blob = await exportBackup();
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `dse-practice-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              {t("settings.export")}
            </Button>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                {t("settings.import")}
                <input
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    try {
                      await importBackup(f);
                      await qc.invalidateQueries();
                      toast.success(t("settings.imported"));
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : common("error"));
                    }
                  }}
                />
              </label>
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.creditHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {history.data?.items.map((row, i) => (
              <li key={i} className="flex justify-between py-1.5">
                <span>{row.reason}</span>
                <span className="text-muted-foreground tabular-nums">
                  {new Date(row.createdAt).toLocaleString()} · {row.delta > 0 ? `+${row.delta}` : row.delta}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      )}

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>{t(isLocalMode ? "settings.deleteLocalTitle" : "settings.deleteTitle")}</CardTitle>
          <CardDescription>{t(isLocalMode ? "settings.deleteLocalBody" : "settings.deleteBody")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input className="max-w-48" placeholder={t("settings.deleteConfirm")} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button
            variant="destructive"
            disabled={confirm !== "DELETE" || del.isPending}
            onClick={async () => {
              await del.mutateAsync();
              if (isLocalMode) {
                setConfirm("");
                router.replace("/onboarding");
                return;
              }
              await authClient.signOut().catch(() => {});
              router.replace("/sign-in");
            }}
          >
            {t(isLocalMode ? "settings.deleteLocalButton" : "settings.deleteButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
