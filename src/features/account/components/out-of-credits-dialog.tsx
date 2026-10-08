"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Opens whenever an API call answers 402 (see lib/api-client.ts). */
export function OutOfCreditsDialog() {
  const t = useTranslations("common.credits");
  const [detail, setDetail] = useState<{ balance?: number; cost?: number } | null>(null);

  useEffect(() => {
    const onEvent = (e: Event) => setDetail((e as CustomEvent).detail ?? {});
    window.addEventListener("credits:insufficient", onEvent);
    return () => window.removeEventListener("credits:insufficient", onEvent);
  }, []);

  return (
    <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("outTitle")}</DialogTitle>
          <DialogDescription>{t("outBody", { cost: detail?.cost ?? 0, balance: detail?.balance ?? 0 })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setDetail(null)}>{t("ok")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
