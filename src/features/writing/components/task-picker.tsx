"use client";

import { Library, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CreditCost } from "@/features/account/components/credits-badge";
import { useJobStream } from "@/features/jobs/api/use-job-stream";
import { JobProgress } from "@/features/jobs/components/job-progress";
import { isLocalMode } from "@/lib/app-mode";
import { CREDIT_COSTS } from "@/lib/credits";
import { Link, useRouter } from "@/lib/i18n/routing";
import { useNextWritingTask, useOwnPrompt, useWritingTopics, type TopicRow } from "../api/use-writing-task";
import { errorMessage, isCreditsError } from "../lib/errors";

type Subject = "chi_writing" | "eng_writing";
type Part = "A" | "B";

/** Pick a task: generate one (bank first), browse the bank, or enter my own question. */
export function TaskPicker() {
  const t = useTranslations("writing");
  return (
    <Tabs defaultValue="generate" className="gap-4">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="generate">
          <Sparkles className="size-4" /> {t("home.tabs.generate")}
        </TabsTrigger>
        <TabsTrigger value="bank">
          <Library className="size-4" /> {t("home.tabs.bank")}
        </TabsTrigger>
        <TabsTrigger value="own">{t("home.tabs.own")}</TabsTrigger>
      </TabsList>
      <TabsContent value="generate">
        <GenerateTaskForm />
      </TabsContent>
      <TabsContent value="bank">
        <BankPanel />
      </TabsContent>
      <TabsContent value="own">
        <OwnPromptForm />
      </TabsContent>
    </Tabs>
  );
}

function SubjectToggle({ value, onChange }: { value: Subject; onChange: (s: Subject) => void }) {
  const common = useTranslations("common");
  return (
    <ToggleGroup type="single" variant="outline" value={value} onValueChange={(v) => v && onChange(v as Subject)} className="flex-wrap">
      <ToggleGroupItem value="chi_writing">{common("subjects.chi_writing")}</ToggleGroupItem>
      <ToggleGroupItem value="eng_writing">{common("subjects.eng_writing")}</ToggleGroupItem>
    </ToggleGroup>
  );
}

function PartToggle({ subject, value, onChange }: { subject: Subject; value: Part; onChange: (p: Part) => void }) {
  const t = useTranslations("writing");
  return (
    <ToggleGroup type="single" variant="outline" value={value} onValueChange={(v) => v && onChange(v as Part)} className="flex-wrap">
      <ToggleGroupItem value="B">{t(`parts.${subject}.B`)}</ToggleGroupItem>
      <ToggleGroupItem value="A">{t(`parts.${subject}.A`)}</ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Genres (Chinese 乙部), text types (Chinese 甲部, English Part B). English Part A has none to pick. */
function typeOptions(subject: Subject, part: Part, topics: TopicRow[]) {
  if (subject === "chi_writing") return topics.filter((x) => x.parentId === (part === "A" ? "CHI-A" : "CHI-B"));
  if (part === "A") return [];
  return topics.filter((x) => x.kind === "text_type");
}

function GenerateTaskForm() {
  const t = useTranslations("writing");
  const locale = useLocale();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject>("chi_writing");
  const [part, setPart] = useState<Part>("B");
  const [type, setType] = useState<string | null>(null);
  const [forceNew, setForceNew] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const topics = useWritingTopics(subject);
  const next = useNextWritingTask();
  const options = useMemo(() => typeOptions(subject, part, topics.data ?? []), [subject, part, topics.data]);

  const job = useJobStream(jobId, {
    onDone: (j) => {
      const id = (j.output as { questionId?: string } | null)?.questionId;
      if (id) router.push(`/writing/${id}`);
    },
  });

  const partTopic = subject === "chi_writing" ? (part === "A" ? "CHI-A" : "CHI-B") : part === "A" ? "ENG-A" : "ENG-B";
  const go = async () => {
    try {
      const res = await next.mutateAsync({
        subject,
        part: subject === "chi_writing" ? (part === "A" ? "甲部" : "乙部") : part,
        topicIds: type ? [partTopic, type] : [partTopic],
        forceNew,
      });
      if (res.questionId) router.push(`/writing/${res.questionId}`);
      else if (res.jobId) setJobId(res.jobId);
    } catch (e) {
      if (!isCreditsError(e)) toast.error(errorMessage(e, t("errors.generic")));
    }
  };

  const busy = next.isPending || (jobId !== null && job?.status !== "failed");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generate.title")}</CardTitle>
        <CardDescription>{t(isLocalMode ? "generate.descriptionLocal" : "generate.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label>{t("generate.subject")}</Label>
          <SubjectToggle
            value={subject}
            onChange={(s) => {
              setSubject(s);
              setType(null);
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("generate.part")}</Label>
          <PartToggle
            subject={subject}
            value={part}
            onChange={(p) => {
              setPart(p);
              setType(null);
            }}
          />
        </div>
        {options.length > 0 && (
          <div className="grid gap-2">
            <Label>{subject === "chi_writing" && part === "B" ? t("generate.genre") : t("generate.textType")}</Label>
            <ToggleGroup type="single" variant="outline" value={type ?? "any"} onValueChange={(v) => setType(!v || v === "any" ? null : v)} className="flex-wrap justify-start">
              <ToggleGroupItem value="any">{t("generate.any")}</ToggleGroupItem>
              {options.map((o) => (
                <ToggleGroupItem key={o.id} value={o.id}>
                  {locale === "en" ? o.nameEn : o.nameZh}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
        {!isLocalMode && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={forceNew} onCheckedChange={(v) => setForceNew(v === true)} />
            {t("generate.forceNew")}
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={go} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {t("generate.submit")}
            <CreditCost cost={forceNew ? CREDIT_COSTS.new_question : 0} />
          </Button>
          {!forceNew && !isLocalMode && <span className="text-muted-foreground text-xs">{t("generate.costNote", { cost: CREDIT_COSTS.new_question })}</span>}
        </div>
        {jobId && <JobProgress job={job} />}
      </CardContent>
    </Card>
  );
}

function BankPanel() {
  const t = useTranslations("writing");
  const common = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bank.title")}</CardTitle>
        <CardDescription>{t(isLocalMode ? "bank.descriptionLocal" : "bank.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {(["chi_writing", "eng_writing"] as const).map((s) => (
          <Button key={s} variant="outline" asChild>
            <Link href={`/bank?subject=${s}&kind=writing_task`}>
              <Library className="size-4" /> {common(`subjects.${s}`)}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function OwnPromptForm() {
  const t = useTranslations("writing");
  const router = useRouter();
  const [subject, setSubject] = useState<Subject>("chi_writing");
  const [part, setPart] = useState<Part>("B");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [materials, setMaterials] = useState("");
  const own = useOwnPrompt();

  const save = async () => {
    try {
      const { questionId } = await own.mutateAsync({ subject, part, text, materials: materials.trim() || null, title: title.trim() || null });
      router.push(`/writing/${questionId}`);
    } catch (e) {
      toast.error(errorMessage(e, t("errors.generic")));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("own.title")}</CardTitle>
        <CardDescription>{t(isLocalMode ? "own.descriptionLocal" : "own.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap gap-4">
          <div className="grid gap-2">
            <Label>{t("generate.subject")}</Label>
            <SubjectToggle value={subject} onChange={setSubject} />
          </div>
          <div className="grid gap-2">
            <Label>{t("generate.part")}</Label>
            <PartToggle subject={subject} value={part} onChange={setPart} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="own-title">{t("own.taskTitle")}</Label>
          <Input id="own-title" value={title} maxLength={80} placeholder={t("own.taskTitlePlaceholder")} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="own-text">{t("own.prompt")}</Label>
          <Textarea id="own-text" value={text} rows={5} maxLength={6000} placeholder={t("own.promptPlaceholder")} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="own-materials">{t("own.materials")}</Label>
          <Textarea id="own-materials" value={materials} rows={4} maxLength={12000} placeholder={t("own.materialsPlaceholder")} onChange={(e) => setMaterials(e.target.value)} />
        </div>
        {!isLocalMode && <p className="text-muted-foreground text-xs">{t("own.privateNote")}</p>}
        <div>
          <Button onClick={save} disabled={own.isPending || text.trim().length < 5}>
            {own.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("own.submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
