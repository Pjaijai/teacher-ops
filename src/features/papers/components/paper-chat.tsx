"use client";

import { Bot, Send, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MicButton } from "@/components/common/mic-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TopicTreePicker } from "@/features/practice/components/topic-tree-picker";
import type { LocalPaper } from "@/features/local/local-db";
import { B_MAX, MC_DEFAULT, MC_MAX, PAPER_MINUTES, type PaperPreset, type PaperSpec } from "@/lib/schemas/paper";
import { useAiDictation } from "@/lib/use-ai-dictation";
import { cn } from "@/lib/utils";
import { generatePaper, saveSpec, sendPlanMessage } from "../api/local-papers";
import { buildPhysicsBlueprint } from "../lib/physics-blueprint";

/** Setup: chat with the AI about the paper on the left; the spec it fills in (editable by hand) on the right. */
export function PaperChat({ paper }: { paper: LocalPaper }) {
  const t = useTranslations("practice.paper");
  const [spec, setSpec] = useState<PaperSpec>(paper.spec);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const count = useMemo(() => buildPhysicsBlueprint(spec).length, [spec]);

  // Take over the spec when an AI reply lands (hand edits are saved as they're made, and stay local until then).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a new chat message, not on our own saves
  useEffect(() => {
    setSpec(paper.spec);
  }, [paper.chat.length]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [paper.chat.length, sending]);

  const edit = (patch: Partial<PaperSpec>) => {
    const next = { ...spec, ...patch };
    setSpec(next);
    setReady(false);
    void saveSpec(paper.id, next);
  };

  // Voice input: AI speech-to-text streams each phrase into the box; the student checks it, then sends.
  const speech = useAiDictation({
    hint: "The student is setting up a mock HKDSE Physics exam paper in a chat.",
    onText: (chunk, startsPhrase) =>
      setText((cur) => (startsPhrase && cur && !/\s$/.test(cur) && /^[A-Za-z0-9]/.test(chunk) ? `${cur} ${chunk}` : cur + chunk)),
  });

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    speech.stop();
    setText("");
    setSending(true);
    try {
      const r = await sendPlanMessage(paper.id, msg, spec);
      setReady(r.ready);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const generate = async () => {
    setStarting(true);
    try {
      await saveSpec(paper.id, spec);
      await generatePaper(paper.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setStarting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card className="flex min-h-[28rem] flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" /> {t("chat.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="grid max-h-[28rem] flex-1 content-start gap-3 overflow-y-auto pr-1">
            <Bubble role="assistant">{t("chat.greeting")}</Bubble>
            {paper.chat.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.text}
              </Bubble>
            ))}
            {sending && <Bubble role="assistant">…</Bubble>}
            <div ref={bottom} />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={speech.listening ? t("chat.listening") : speech.transcribing ? t("chat.transcribing") : t("chat.placeholder")}
              maxLength={2000}
              disabled={sending}
            />
            {speech.supported && (
              <MicButton
                listening={speech.listening}
                transcribing={speech.transcribing}
                level={speech.level}
                onStart={speech.start}
                onStop={speech.stop}
                disabled={sending}
                labels={{ start: t("chat.micStart"), stop: t("chat.micStop") }}
              />
            )}
            <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label={t("chat.send")}>
              <Send className="size-4" />
            </Button>
          </form>
          {(speech.listening || speech.transcribing) && (
            <p className="-mt-1 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-500">
              <span className="size-1.5 animate-pulse rounded-full bg-green-600" />
              {speech.listening ? t("chat.listening") : t("chat.transcribing")}
            </p>
          )}
          {speech.error && (
            <p className="text-destructive -mt-1 text-xs">
              {t(speech.error === "not-allowed" ? "chat.micBlocked" : speech.error === "no-mic" ? "chat.noMic" : "chat.micError")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("spec.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("spec.preset")}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={spec.preset}
              onValueChange={(v) => v && edit({ preset: v as PaperPreset, durationMin: PAPER_MINUTES[v as PaperPreset] })}
              className="justify-start"
            >
              {(["full", "1A", "1B"] as const).map((p) => (
                <ToggleGroupItem key={p} value={p} className="px-3">
                  {t(`presetsShort.${p}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="text-muted-foreground text-xs">{t("spec.count", { count: count })}</span>
          </div>

          {spec.preset !== "1B" && (
            <div className="grid gap-1.5">
              <Label className="text-xs" htmlFor="paper-mc">
                {t("spec.mcCount")}
              </Label>
              <Input
                id="paper-mc"
                type="number"
                min={1}
                max={MC_MAX}
                value={spec.mcCount ?? MC_DEFAULT}
                onChange={(e) => edit({ mcCount: Math.min(MC_MAX, Math.max(1, Number(e.target.value) || 1)) })}
                className="w-24"
              />
            </div>
          )}
          {spec.preset !== "1A" && (
            <div className="grid gap-1.5">
              <Label className="text-xs" htmlFor="paper-b">
                {t("spec.bCount")}
              </Label>
              <Input
                id="paper-b"
                type="number"
                min={1}
                max={B_MAX}
                value={spec.bCount ?? ""}
                placeholder={t("spec.bCountAuto")}
                onChange={(e) => edit({ bCount: e.target.value ? Math.min(B_MAX, Math.max(1, Number(e.target.value) || 1)) : null })}
                className="w-40"
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">{t("spec.topics")}</Label>
            {spec.topicIds.length === 0 ? (
              <span className="text-muted-foreground text-xs">{t("spec.allTopics")}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {spec.topicIds.map((id) => (
                  <Badge key={id} variant="secondary" className="gap-1 font-mono">
                    {id}
                    <button type="button" onClick={() => edit({ topicIds: spec.topicIds.filter((x) => x !== id) })} aria-label={t("spec.remove")}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <details className="rounded-md border p-2">
              <summary className="cursor-pointer text-xs">{t("spec.pickTopics")}</summary>
              <div className="mt-3">
                <TopicTreePicker subject="physics" value={spec.topicIds} onChange={(ids) => edit({ topicIds: ids })} max={20} />
              </div>
            </details>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">{t("spec.difficulty")}</Label>
            <ToggleGroup type="single" variant="outline" value={String(spec.difficulty)} onValueChange={(v) => v && edit({ difficulty: Number(v) })} className="justify-start">
              {[1, 2, 3, 4, 5].map((d) => (
                <ToggleGroupItem key={d} value={String(d)} className="w-9">
                  {d}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Label className="flex items-center justify-between gap-3 font-normal">
            {t("spec.extension")}
            <Switch checked={spec.extension} onCheckedChange={(v) => edit({ extension: v })} />
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">{t("spec.language")}</Label>
              <ToggleGroup type="single" variant="outline" value={spec.language} onValueChange={(v) => v && edit({ language: v as "zh" | "en" })} className="justify-start">
                <ToggleGroupItem value="zh">中文</ToggleGroupItem>
                <ToggleGroupItem value="en">EN</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs" htmlFor="paper-minutes">
                {t("spec.minutes")}
              </Label>
              <Input
                id="paper-minutes"
                type="number"
                min={5}
                max={240}
                value={spec.durationMin}
                onChange={(e) => edit({ durationMin: Math.min(240, Math.max(5, Number(e.target.value) || 5)) })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="paper-focus">
              {t("spec.focus")}
            </Label>
            <Textarea
              id="paper-focus"
              rows={2}
              value={spec.focus.join("\n")}
              onChange={(e) => edit({ focus: e.target.value.split("\n").slice(0, 12) })}
              onBlur={() => edit({ focus: spec.focus.map((f) => f.trim()).filter(Boolean) })}
              placeholder={t("spec.focusPlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="paper-notes">
              {t("spec.notes")}
            </Label>
            <Textarea id="paper-notes" rows={2} maxLength={500} value={spec.notes} onChange={(e) => edit({ notes: e.target.value })} placeholder={t("spec.notesPlaceholder")} />
          </div>

          <Button onClick={generate} disabled={starting} variant={ready ? "default" : "outline"}>
            <Sparkles className="size-4" /> {t("generate", { count: count })}
          </Button>
          {!ready && <p className="text-muted-foreground -mt-2 text-xs">{t("chat.notReady")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
        role === "user" ? "bg-primary text-primary-foreground justify-self-end" : "bg-muted justify-self-start",
      )}
    >
      {children}
    </div>
  );
}
