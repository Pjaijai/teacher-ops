"use client";

import { Info, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCost } from "@/features/account/components/credits-badge";
import { isLocalMode } from "@/lib/app-mode";
import { CREDIT_COSTS } from "@/lib/credits";
import { HELPER_KINDS, type HelperKind } from "@/lib/schemas/writing";
import { useAskHelper } from "../api/use-writing-task";
import { errorMessage, isCreditsError } from "../lib/errors";
import { HelperContent } from "./helper-content";

const cost = (kind: HelperKind) => (kind === "task_analysis" ? CREDIT_COSTS.task_analysis : CREDIT_COSTS.helper);

/** Ask-AI helpers before writing: 解題 / 大綱 / 詞彙 / 句式 / 成語. Scaffolding only; cached per question. */
export function HelperPanel({
  questionId,
  subject,
  helpers,
}: {
  questionId: string;
  subject: "chi_writing" | "eng_writing";
  helpers: Partial<Record<HelperKind, unknown>>;
}) {
  const t = useTranslations("writing.helpers");
  const ask = useAskHelper(questionId);

  const run = async (kind: HelperKind) => {
    try {
      await ask.mutateAsync(kind);
    } catch (e) {
      if (!isCreditsError(e)) toast.error(errorMessage(e, t(isLocalMode ? "failedLocal" : "failed")));
    }
  };

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Alert>
          <Info className="size-4" />
          <AlertDescription>{t("scaffoldingOnly")}</AlertDescription>
        </Alert>
        <Tabs defaultValue="task_analysis" className="gap-3">
          <TabsList className="h-auto w-full flex-wrap">
            {HELPER_KINDS.map((k) => (
              <TabsTrigger key={k} value={k} className="text-xs sm:text-sm">
                {t(`tabs.${subject === "chi_writing" ? "zh" : "en"}.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {HELPER_KINDS.map((k) => (
            <TabsContent key={k} value={k}>
              {helpers[k] ? (
                <ScrollArea className="max-h-[60vh] pr-3">
                  <HelperContent kind={k} content={helpers[k]} />
                </ScrollArea>
              ) : (
                <div className="grid gap-3 rounded-lg border border-dashed p-4">
                  <p className="text-muted-foreground text-sm">{t(`about.${k}`)}</p>
                  <div>
                    <Button onClick={() => run(k)} disabled={ask.isPending}>
                      {ask.isPending && ask.variables === k ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {t("ask")}
                      <CreditCost cost={cost(k)} />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        <p className="text-muted-foreground text-xs">{t(isLocalMode ? "cachedNoteLocal" : "cachedNote")}</p>
      </CardContent>
    </Card>
  );
}
