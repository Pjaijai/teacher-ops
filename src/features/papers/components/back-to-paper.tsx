"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { listPapers } from "@/features/local/local-db";
import { isLocalMode } from "@/lib/app-mode";
import { Link } from "@/lib/i18n/routing";

/** "Back to paper" on a practice question or attempt whose question belongs to an exam paper on this device. */
export function BackToPaper({ questionId }: { questionId: string }) {
  const t = useTranslations("practice.paper");
  const [paperId, setPaperId] = useState<string | null>(null);
  useEffect(() => {
    if (!isLocalMode) return;
    void listPapers().then((papers) => setPaperId(papers.find((p) => p.slots.some((s) => s.questionId === questionId))?.id ?? null));
  }, [questionId]);
  if (!paperId) return null;
  return (
    <Link href={`/practice/papers/${paperId}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm print:hidden">
      <ArrowLeft className="size-4" /> {t("backToPaper")}
    </Link>
  );
}
