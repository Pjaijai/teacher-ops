import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import "katex/dist/katex.min.css";
import "../globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { loadMessages } from "@/lib/i18n/request";
import { routing } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DSE Practice",
  description: "HKDSE writing and maths practice with AI feedback",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await loadMessages(locale);

  return (
    <html lang={locale === "zh-HK" ? "zh-Hant-HK" : "en"} className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-svh antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Hong_Kong">
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
