"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/lib/i18n/routing";
import { createPaper, deletePaper } from "../api/local-papers";
import { usePapers } from "../api/use-paper";

/** Physics → "Exam paper" tab: start a new mock paper (opens the setup chat) and list this device's papers. */
export function PaperSetupPanel() {
  const t = useTranslations("practice.paper");
  const locale = useLocale();
  const router = useRouter();
  const papers = usePapers();
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const p = await createPaper();
      router.push(`/practice/papers/${p.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    await deletePaper(id);
    void papers.refetch();
  };

  const list = papers.data ?? [];
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>
      <div>
        <Button onClick={create} disabled={creating}>
          <Plus className="size-4" /> {t("new")}
        </Button>
      </div>
      {list.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("mine")}</h3>
          <ul className="grid gap-1.5">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <Link href={`/practice/papers/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                  {t(`presets.${p.spec.preset}`)} · {new Date(p.createdAt).toLocaleDateString(locale)}
                </Link>
                <Badge variant="outline">{t(`status.${p.status}`)}</Badge>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(p.id)} aria-label={t("delete")}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
