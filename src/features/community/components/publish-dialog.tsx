"use client";

import { isLocalMode } from "@/lib/app-mode";

import { Globe, Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useMe, useUpdateProfile } from "@/features/account/api/use-me";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError } from "@/lib/api-client";
import { useMakePrivate, usePublishAnswer, usePublishedState } from "../api/use-community-answers";

/** Make a writing submission or practice attempt public (as a snapshot), or take it back private. */
export function PublishButton({
  sourceType,
  sourceId,
  questionId,
  isPrivateQuestion,
}: {
  sourceType: "writing" | "attempt";
  sourceId: string;
  questionId: string;
  isPrivateQuestion: boolean;
}) {
  if (isLocalMode) return null; // community needs accounts and a database (cloud mode)
  const t = useTranslations("community");
  const me = useMe();
  const state = usePublishedState(sourceId);
  const publish = usePublishAnswer(sourceId, questionId);
  const makePrivate = useMakePrivate(sourceId, questionId);
  const updateProfile = useUpdateProfile();

  const [open, setOpen] = useState(false);
  const [includeScore, setIncludeScore] = useState(false);
  const [includeFeedback, setIncludeFeedback] = useState(false);
  const [nickname, setNickname] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  if (isPrivateQuestion) {
    return (
      <div className="grid gap-1">
        <Button variant="outline" disabled>
          <Lock /> {t("makePublic")}
        </Button>
        <p className="text-muted-foreground text-xs">{t("privateQuestion")}</p>
      </div>
    );
  }

  const answer = state.data?.answer;
  const published = answer?.status === "published";
  const hiddenByReports = answer?.status === "hidden_reported" || answer?.status === "removed";
  const hasNickname = Boolean(me.data?.profile?.nickname);

  const submit = async () => {
    setProblem(null);
    try {
      if (!hasNickname) {
        if (nickname.trim().length < 2) return setProblem(t("nicknameShort"));
        await updateProfile.mutateAsync({ nickname: nickname.trim() });
      }
      await publish.mutateAsync({ sourceType, sourceId, includeScore, includeFeedback });
      toast.success(t("publishedToast"));
      setOpen(false);
    } catch (e) {
      if (e instanceof ApiClientError) {
        const found = (e.body.found as { kind: string }[] | undefined) ?? [];
        const kinds = [...new Set(found.map((f) => t(`pi.${f.kind}` as "pi.phone")))].join(", ");
        setProblem(found.length ? t("personalInfoFound", { kinds }) : e.message);
      } else setProblem(t("publishFailed"));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {published && (
        <Badge variant="secondary" className="gap-1">
          <Globe className="size-3" /> {t("isPublic")}
        </Badge>
      )}
      {hiddenByReports && <Badge variant="destructive">{t("hiddenReported")}</Badge>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={published ? "outline" : "default"} disabled={hiddenByReports}>
            <Globe /> {published ? t("update") : t("makePublic")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{published ? t("updateTitle") : t("publishTitle")}</DialogTitle>
            <DialogDescription>{t("publishIntro")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {!hasNickname && (
              <div className="grid gap-1.5">
                <Label htmlFor="nickname">{t("nickname")}</Label>
                <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} placeholder={t("nicknamePlaceholder")} />
                <p className="text-muted-foreground text-xs">{t("nicknameHelp")}</p>
              </div>
            )}
            <Label className="font-normal">
              <Checkbox checked={includeScore} onCheckedChange={(v) => setIncludeScore(Boolean(v))} /> {t("includeScore")}
            </Label>
            <Label className="font-normal">
              <Checkbox checked={includeFeedback} onCheckedChange={(v) => setIncludeFeedback(Boolean(v))} /> {t("includeFeedback")}
            </Label>
            <Alert>
              <TriangleAlert />
              <AlertTitle>{t("warnTitle")}</AlertTitle>
              <AlertDescription>{t("warnBody")}</AlertDescription>
            </Alert>
            {problem && <p className="text-destructive text-sm">{problem}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={publish.isPending || updateProfile.isPending}>
              {published ? t("update") : t("publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {published && answer && (
        <Button
          variant="ghost"
          onClick={() => makePrivate.mutate(answer.id, { onSuccess: () => toast.success(t("madePrivateToast")) })}
          disabled={makePrivate.isPending}
        >
          <Lock /> {t("makePrivate")}
        </Button>
      )}
    </div>
  );
}
