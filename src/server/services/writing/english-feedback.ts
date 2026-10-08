import { askStructured, type UsageSink } from "@/server/ai/open-router";
import { ENGLISH_FEEDBACK_SYSTEM, EnglishFeedbackSchema } from "@/server/ai/prompts/writing-feedback";
import { commonRows, type FeedbackDraft } from "./chinese-feedback";
import { TextLocator } from "./locate-feedback";

/** AI feedback (top model): task recap, strengths, tagged errors (rubric §5), upgrades, overall. */
export async function englishFeedback(opts: { text: string; task: string; title?: string | null; onUsage: UsageSink }): Promise<{ rows: FeedbackDraft[] }> {
  const fb = await askStructured({
    purpose: "writing_feedback_english",
    tier: "top",
    system: ENGLISH_FEEDBACK_SYSTEM,
    text: `TASK\n${opts.task}\n\nSTUDENT'S WRITING${opts.title ? ` (title: ${opts.title})` : ""}\n${opts.text}`,
    schema: EnglishFeedbackSchema,
    onUsage: opts.onUsage,
  });

  const loc = new TextLocator(opts.text);
  const used = new Set<number>();
  const rows: FeedbackDraft[] = [];
  for (const e of fb.errors) {
    // Repeated identical quotes each get their own mark (the next unused occurrence).
    const span = loc.find(e.quote, { used });
    if (span) used.add(span.start);
    rows.push({ kind: "eng_error", startPos: span?.start ?? null, endPos: span?.end ?? null, payload: e, tags: [e.tag], criterion: "language" });
  }
  rows.push(...commonRows(loc, fb));
  return { rows };
}
