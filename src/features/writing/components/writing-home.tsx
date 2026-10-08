"use client";

import { HardDrive } from "lucide-react";
import { useTranslations } from "next-intl";
import { isLocalMode } from "@/lib/app-mode";
import { RecentSubmissions } from "./recent-submissions";
import { TaskPicker } from "./task-picker";

export function WritingHome() {
  const t = useTranslations("writing");
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("home.subtitle")}</p>
        {isLocalMode && (
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
            <HardDrive className="size-3.5 shrink-0" /> {t("home.localNote")}
          </p>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <TaskPicker />
        <RecentSubmissions />
      </div>
    </div>
  );
}
