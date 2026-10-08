import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-HK", "en"],
  defaultLocale: "zh-HK",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Locale-aware Link, redirect, usePathname, useRouter. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
