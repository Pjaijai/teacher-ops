"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { useDispute } from "../api/use-attempt";

/** "I think this mark is wrong" — stored for review; it doesn't change the score. */
export function DisputeDialog({
  attemptId,
  part,
  markIndex,
  label,
  disputed,
}: {
  attemptId: string;
  part: string;
  markIndex: number | null;
  label: string;
  disputed?: boolean;
}) {
  const t = useTranslations("practice.dispute");
  const common = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const dispute = useDispute(attemptId);

  const submit = async () => {
    try {
      await dispute.mutateAsync({ part, markIndex, reason });
      toast.success(isLocalMode ? t("sentLocal") : t("sent"));
      setOpen(false);
      setReason("");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : common("error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs" className="text-muted-foreground print:hidden" disabled={disputed}>
          <Flag className="size-3" /> {disputed ? t("disputed") : t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { label })}</DialogTitle>
          <DialogDescription>{isLocalMode ? t("descriptionLocal") : t("description")}</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("placeholder")} className="min-h-28" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {common("cancel")}
          </Button>
          <Button onClick={submit} disabled={reason.trim().length < 5 || dispute.isPending}>
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
