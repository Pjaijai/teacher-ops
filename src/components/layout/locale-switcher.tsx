"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/lib/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const next = locale === "zh-HK" ? "en" : "zh-HK";
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Switch language"
      onClick={() => router.replace(`${pathname}${window.location.search}`, { locale: next })}
    >
      <Languages className="size-4" />
      {next === "en" ? "English" : "中文"}
    </Button>
  );
}
