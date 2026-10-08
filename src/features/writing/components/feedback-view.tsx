"use client";

import { CheckCircle2, CircleAlert, CircleDashed, RotateCcw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PublishButton } from "@/features/community/components/publish-dialog";
import type { PublicJob } from "@/server/api/routes/jobs";
import { Link } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import type { FeedbackItem, SubmissionView } from "../api/use-submission";
import type { OverallPayload, StrengthPayload, TaskRecapPayload } from "../lib/feedback-types";
import type { MarkKind, TextMark } from "../lib/segments";
import { DseEstimateCard } from "./dse-estimate-card";
import { FeedbackMarkCard } from "./feedback-mark";
import { MARK_CLASS, MarkedText } from "./marked-text";
import { SampleCompare } from "./sample-compare";
import { SamplePanel } from "./sample-panel";
import { EditList } from "./transcript-review";
import { UpgradeList } from "./upgrade-list";

type Layer = "errors" | "sentences" | "upgrades" | "script" | "edits";
const LAYER_OF: Partial<Record<MarkKind, Layer>> = {
  wrong_char: "errors",
  eng_error: "errors",
  problem_sentence: "sentences",
  good_sentence: "sentences",
  vocab_upgrade: "upgrades",
  structure_upgrade: "upgrades",
  mixed_script: "script",
  edit: "edits",
};
const TAB_OF: Partial<Record<MarkKind, string>> = {
  wrong_char: "errors",
  eng_error: "errors",
  mixed_script: "errors",
  problem_sentence: "errors",
  good_sentence: "upgrades",
  vocab_upgrade: "upgrades",
  structure_upgrade: "upgrades",
  edit: "edits",
};

/** Graded submission: marks on the essay + side panel (解題 recap, strengths, errors, upgrades, estimate) + actions. */
export function FeedbackView({ data, job }: { data: SubmissionView; job: PublicJob | null }) {
  const t = useTranslations("writing.feedback");
  const s = data.submission;
  const isChinese = data.subject === "chi_writing";
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [layers, setLayers] = useState<Layer[]>(["errors", "sentences", "upgrades", "script", "edits"]);

  const byKind = (k: FeedbackItem["kind"]) => data.feedback.filter((f) => f.kind === k);
  const recap = byKind("task_recap")[0]?.payload as TaskRecapPayload | undefined;
  const overall = byKind("overall")[0]?.payload as OverallPayload | undefined;
  const strengths = byKind("strength");
  const errorItems = isChinese ? [...byKind("wrong_char"), ...byKind("problem_sentence")] : byKind("eng_error");
  const scriptItems = byKind("mixed_script");
  const upgradeItems = data.feedback.filter((f) => f.kind === "vocab_upgrade" || f.kind === "structure_upgrade");
  const goodItems = byKind("good_sentence");

  const marks: TextMark[] = useMemo(() => {
    const out: TextMark[] = [];
    for (const f of data.feedback) {
      const layer = LAYER_OF[f.kind as MarkKind];
      if (f.startPos == null || f.endPos == null || !layer || !layers.includes(layer)) continue;
      out.push({ id: f.id, start: f.startPos, end: f.endPos, kind: f.kind as MarkKind });
    }
    if (layers.includes("edits")) s.edits.forEach((e, i) => e.after && out.push({ id: `edit-${i}`, start: e.at, end: e.at + e.after.length, kind: "edit" }));
    return out;
  }, [data.feedback, layers, s.edits]);

  const select = (id: string) => {
    setActiveId(id);
    const kind = (data.feedback.find((f) => f.id === id)?.kind ?? (id.startsWith("edit-") ? "edit" : undefined)) as MarkKind | undefined;
    const nextTab = kind ? TAB_OF[kind] : undefined;
    if (nextTab) setTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`fb-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };

  const titleFor = (m: TextMark) => {
    const f = data.feedback.find((x) => x.id === m.id);
    const p = f?.payload as Record<string, unknown> | undefined;
    if (!p) return undefined;
    return [p.correct ?? p.correction ?? p.suggestion ?? p.rewrite, p.explanation ?? p.issue ?? p.reason ?? p.note].filter(Boolean).join(" — ") || undefined;
  };

  const estimateLevel = data.estimate?.level ?? null;
  const sampleRunning = data.activeJob?.kind === "level_sample";

  return (
    <div className="grid gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Card className="gap-4">
          <CardHeader className="gap-3">
            <CardTitle>{t("yourEssay")}</CardTitle>
            <ToggleGroup type="multiple" variant="outline" size="sm" value={layers} onValueChange={(v) => setLayers(v as Layer[])} className="flex-wrap justify-start">
              <ToggleGroupItem value="errors">
                <span className={cn(isChinese ? MARK_CLASS.wrong_char : MARK_CLASS.eng_error, "px-1")}>{isChinese ? t("layers.wrongChars") : t("layers.errors")}</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="sentences">
                <span className={cn(MARK_CLASS.problem_sentence, "px-1")}>{isChinese ? t("layers.problem") : t("layers.sentences")}</span>
                {isChinese && <span className={cn(MARK_CLASS.good_sentence, "px-1")}>{t("layers.good")}</span>}
              </ToggleGroupItem>
              <ToggleGroupItem value="upgrades">
                <span className={cn(MARK_CLASS.vocab_upgrade, "px-1")}>{t("layers.upgrades")}</span>
              </ToggleGroupItem>
              {isChinese && scriptItems.length > 0 && (
                <ToggleGroupItem value="script">
                  <span className={cn(MARK_CLASS.mixed_script, "px-1")}>{t("layers.script")}</span>
                </ToggleGroupItem>
              )}
              {s.edits.length > 0 && (
                <ToggleGroupItem value="edits">
                  <span className={cn(MARK_CLASS.edit, "px-1")}>{t("layers.edits")}</span>
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <MarkedText text={data.cleanText} marks={marks} activeId={activeId} onSelect={select} titleFor={titleFor} />
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 lg:sticky lg:top-4">
          <CardContent>
            <Tabs value={tab} onValueChange={setTab} className="gap-3">
              <TabsList className="w-full">
                <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
                <TabsTrigger value="errors">
                  {t("tabs.errors")}
                  <Badge variant="secondary" className="ml-1 px-1.5">
                    {errorItems.length + scriptItems.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="upgrades">{t("tabs.upgrades")}</TabsTrigger>
                {s.edits.length > 0 && <TabsTrigger value="edits">{t("tabs.edits")}</TabsTrigger>}
              </TabsList>
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <TabsContent value="overview" className="grid gap-4">
                  {recap && <TaskRecap recap={recap} />}
                  {strengths.length > 0 && (
                    <div className="grid gap-1.5">
                      <p className="text-sm font-medium">{t("strengths")}</p>
                      <ul className="grid gap-1.5">
                        {strengths.map((f) => {
                          const p = f.payload as StrengthPayload;
                          return (
                            <li key={f.id}>
                              <button type="button" id={`fb-${f.id}`} onClick={() => f.startPos != null && select(f.id)} className="flex gap-2 text-left text-sm">
                                <Sparkles className="text-mark-good mt-0.5 size-4 shrink-0" />
                                <span>
                                  {p.point}
                                  {p.quote && <span className="text-muted-foreground block text-xs">「{p.quote}」</span>}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {overall && (
                    <div className="grid gap-1.5">
                      <p className="text-sm font-medium">{t("overall")}</p>
                      <p className="text-sm">{overall.comment}</p>
                      {overall.nextSteps.length > 0 && (
                        <ul className="text-muted-foreground list-disc pl-5 text-sm">
                          {overall.nextSteps.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="errors" className="grid gap-4">
                  {isChinese ? (
                    <>
                      <ItemGroup title={t("groups.wrongChars", { n: byKind("wrong_char").length })} items={byKind("wrong_char")} activeId={activeId} onSelect={select} empty={t("groups.none")} />
                      <ItemGroup title={t("groups.problem", { n: byKind("problem_sentence").length })} items={byKind("problem_sentence")} activeId={activeId} onSelect={select} empty={t("groups.none")} />
                      {scriptItems.length > 0 && (
                        <ItemGroup
                          title={t("groups.script", { n: scriptItems.length, script: t(`script.${s.dominantScript ?? "trad"}`) })}
                          note={t("groups.scriptNote")}
                          items={scriptItems}
                          activeId={activeId}
                          onSelect={select}
                          compact
                        />
                      )}
                    </>
                  ) : (
                    <EnglishErrors items={errorItems} activeId={activeId} onSelect={select} />
                  )}
                </TabsContent>
                <TabsContent value="upgrades" className="grid gap-4">
                  <UpgradeList items={upgradeItems} activeId={activeId} onSelect={select} />
                  <ItemGroup title={t("groups.good", { n: goodItems.length })} items={goodItems} activeId={activeId} onSelect={select} />
                </TabsContent>
                {s.edits.length > 0 && (
                  <TabsContent value="edits" className="grid gap-2">
                    <p className="text-muted-foreground text-sm">{t("editsNote")}</p>
                    <EditList edits={s.edits} />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {data.estimate && <DseEstimateCard estimate={data.estimate} scores={data.scores} />}

      <Card>
        <CardHeader>
          <CardTitle>{t("next.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t("next.sample")}</p>
            <p className="text-muted-foreground text-sm">{t("next.sampleHelp")}</p>
            <SamplePanel submissionId={s.id} estimateLevel={estimateLevel} job={sampleRunning ? job : null} running={sampleRunning} />
          </div>
          <div className="flex flex-wrap content-start items-start gap-2 md:flex-col">
            <Button variant="outline" asChild>
              <Link href={`/writing/${s.questionId}?revise=${s.id}`}>
                <RotateCcw className="size-4" /> {t("next.revise")}
              </Link>
            </Button>
            <PublishButton sourceType="writing" sourceId={s.id} questionId={s.questionId} isPrivateQuestion={data.question.isPrivate} />
          </div>
        </CardContent>
      </Card>

      {data.samples.map((sample) => (
        <SampleCompare key={sample.id} original={data.cleanText} sample={sample} />
      ))}
    </div>
  );
}

function TaskRecap({ recap }: { recap: TaskRecapPayload }) {
  const t = useTranslations("writing.feedback");
  const Icon = recap.verdict === "met" ? CheckCircle2 : recap.verdict === "partly" ? CircleDashed : CircleAlert;
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icon className={cn("size-4", recap.verdict === "met" ? "text-mark-good" : recap.verdict === "partly" ? "text-mark-problem" : "text-mark-wrong")} />
        {t("recap")} · {t(`verdict.${recap.verdict}`)}
      </p>
      <p className="text-sm">{recap.summary}</p>
      <ul className="grid gap-1">
        {recap.points.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm">
            {p.met ? <CheckCircle2 className="text-mark-good mt-0.5 size-4 shrink-0" /> : <CircleAlert className="text-mark-problem mt-0.5 size-4 shrink-0" />}
            <span>
              <span className="font-medium">{p.requirement}</span>
              <span className="text-muted-foreground"> — {p.comment}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemGroup({
  title,
  note,
  items,
  activeId,
  onSelect,
  empty,
  compact = false,
}: {
  title: string;
  note?: string;
  items: FeedbackItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  empty?: string;
  compact?: boolean;
}) {
  if (items.length === 0 && !empty) return null;
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{title}</p>
      {note && <p className="text-muted-foreground text-xs">{note}</p>}
      {items.length === 0 && <p className="text-muted-foreground text-sm">{empty}</p>}
      <div className={compact ? "grid grid-cols-2 gap-1.5 sm:grid-cols-3" : "grid gap-2"}>
        {items.map((f) => (
          <FeedbackMarkCard key={f.id} item={f} active={activeId === f.id} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

/** English errors grouped by rubric tag, most frequent first. */
function EnglishErrors({ items, activeId, onSelect }: { items: FeedbackItem[]; activeId: string | null; onSelect: (id: string) => void }) {
  const t = useTranslations("writing.feedback");
  const tags = useTranslations("writing.tags");
  const groups = new Map<string, FeedbackItem[]>();
  for (const f of items) {
    const tag = f.tags[0] ?? "other";
    groups.set(tag, [...(groups.get(tag) ?? []), f]);
  }
  if (items.length === 0) return <p className="text-muted-foreground text-sm">{t("groups.none")}</p>;
  return (
    <>
      {[...groups.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([tag, list]) => {
          const key = tag.replace(/^en\./, "");
          return (
            <ItemGroup
              key={tag}
              title={`${tags.has(key) ? tags(key as "sva") : tag} (${list.length})`}
              items={list}
              activeId={activeId}
              onSelect={onSelect}
            />
          );
        })}
    </>
  );
}
