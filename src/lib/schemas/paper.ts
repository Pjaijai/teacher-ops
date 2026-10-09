import { z } from "zod";
import { ExamLanguageSchema } from "./question";

/** Physics exam paper mode: what the student wants in the paper (filled by the setup chat or by hand). */

export const PaperPresetSchema = z.enum(["full", "1A", "1B"]);
export type PaperPreset = z.infer<typeof PaperPresetSchema>;

/** Section A size: 33 in the real paper; students may ask for a shorter set. */
export const MC_DEFAULT = 33;
export const MC_MAX = 40;
/** Section B: null = automatic (about 84 marks, as in the real paper), else 1–B_MAX structured questions. */
export const B_MAX = 12;

/** Default sitting time per preset, in minutes (Paper 1 is 2 h 30 min in the real exam). */
export const PAPER_MINUTES: Record<PaperPreset, number> = { full: 150, "1A": 60, "1B": 90 };

export const PaperSpecSchema = z.object({
  preset: PaperPresetSchema,
  /** Topic or subtopic ids (PHY-II-2, PHY-II-2.1); empty = the whole compulsory syllabus. */
  topicIds: z.array(z.string()).max(40),
  /** Paper average, 1–5. */
  difficulty: z.number().int().min(1).max(5),
  extension: z.boolean(),
  language: ExamLanguageSchema,
  /** Number of MC questions in Section A (ignored for 1B only). */
  mcCount: z.number().int().min(1).max(MC_MAX).default(MC_DEFAULT),
  /** Number of structured questions in Section B; null = automatic (about 84 marks). Ignored for 1A only. */
  bCount: z.number().int().min(1).max(B_MAX).nullable().default(null),
  durationMin: z.number().int().min(5).max(240),
  /** Knowledge points to stress, spread over the paper. */
  focus: z.array(z.string().max(200)).max(12),
  /** Free-text instructions applied to every question. */
  notes: z.string().max(500),
});
export type PaperSpec = z.infer<typeof PaperSpecSchema>;

export const defaultPaperSpec = (language: "zh" | "en", extension: boolean): PaperSpec => ({
  preset: "full",
  topicIds: [],
  difficulty: 3,
  extension,
  language,
  mcCount: MC_DEFAULT,
  bCount: null,
  durationMin: PAPER_MINUTES.full,
  focus: [],
  notes: "",
});

export const ChatMessageSchema = z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) });
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AiPaperPlanSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(40),
  spec: PaperSpecSchema,
});

export type PaperPlanReply = { reply: string; spec: PaperSpec; ready: boolean };
