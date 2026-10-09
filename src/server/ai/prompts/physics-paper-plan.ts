import { z } from "zod";
import { B_MAX, MC_MAX, PAPER_MINUTES, type ChatMessage, type PaperSpec } from "@/lib/schemas/paper";
import { PHYSICS_TOPICS } from "./physics-rules";

/**
 * Exam paper setup chat: the model asks the student what paper they want and keeps a spec up to date.
 * Stateless — the browser sends the whole conversation and the current spec every turn.
 */

const COMPULSORY = PHYSICS_TOPICS.filter((t) => /^PHY-(I|II|III|IV|V)-/.test(t.id));

/** Topic and subtopic ids the spec may use. */
export const PAPER_TOPIC_IDS = new Set(COMPULSORY.flatMap((t) => [t.id, ...t.objectives.map((o) => o.id)]));

const syllabus = () =>
  COMPULSORY.map(
    (t) =>
      `${t.id}${t.extension ? " [EXT]" : ""} ${t.strand} — ${t.nameEn} (${t.nameZh})\n${t.objectives.map((o) => `  ${o.id} ${o.textEn.split(/[:;]/)[0].slice(0, 90)}`).join("\n")}`,
  ).join("\n");

export const AiPaperPlanReplySchema = z.object({
  reply: z.string().describe("Your next chat message to the student, in the student's language. Short: 1–4 sentences."),
  spec: z.object({
    preset: z.enum(["full", "1A", "1B"]),
    topicIds: z.array(z.string()).describe("Topic or subtopic ids from the list; [] = whole compulsory syllabus"),
    difficulty: z.number().describe("1–5, the paper's average"),
    extension: z.boolean().describe("true = include extension [EXT] (starred *) content"),
    language: z.enum(["zh", "en"]).describe("Language of the questions"),
    mcCount: z.number().describe("Number of MC questions in Section A (default 33)"),
    bCount: z.number().nullable().describe(`Number of structured questions in Section B (1–${B_MAX}); null = automatic (about 84 marks)`),
    durationMin: z.number().describe("Sitting time in minutes"),
    focus: z.array(z.string()).describe("Knowledge points the student wants stressed, short phrases"),
    notes: z.string().describe("Other instructions for every question (contexts, style); \"\" if none"),
  }),
  ready: z.boolean().describe("true once the student has confirmed the summary (or asked to generate now)"),
});

export function physicsPaperPlanSystem() {
  return `You help a Hong Kong HKDSE Physics student set up a MOCK EXAM PAPER. Chat with them, find out what they want, and
keep the paper spec up to date. You do not write questions here.

Paper types (preset):
- "full": Paper 1 — Section A (1A) 33 multiple choice (mcCount; the student may ask for fewer or more, 1–${MC_MAX}) + Section B (1B) about 9–10 structured questions, ~84 marks. ${PAPER_MINUTES.full} min.
- "1A": Section A only — 33 MC by default (mcCount). ${PAPER_MINUTES["1A"]} min.
- "1B": Section B only — structured questions, ~84 marks. ${PAPER_MINUTES["1B"]} min.
Electives (Paper 2) are not offered.

What to find out, ONE or TWO questions per message, skipping anything already answered or set in the spec:
1. Which paper: full, 1A or 1B.
2. Topics: whole syllabus, or only some topics / subtopics (use ids from the list; a topic id means all its subtopics).
3. How many questions: for full or 1A the number of MC questions (mcCount, default 33 as in the real paper); for full or
   1B the number of structured questions (bCount, null = automatic, about 9–10 questions / 84 marks). Difficulty 1–5 (3 = typical DSE) and whether to include extension [EXT] (*) content.
4. Anything to stress (knowledge points → focus) or other wishes (contexts, style → notes).
Then give a short summary of the paper and ask them to confirm. When they confirm (or say "go"/"generate"), set
ready=true. If they change something later, set ready=false and confirm again.

Rules:
- Always return the FULL spec. Start from the current spec you are given and change only what the student asked for.
  The student may also have edited the spec by hand — trust the current spec.
- When the preset changes, set durationMin to that preset's time unless the student asked for another time.
- topicIds only from this list (exact ids). Never invent ids:
${syllabus()}
- Write "reply" in the language of the student's LAST message (English if they wrote English, Traditional Chinese if they
  wrote Chinese) — not the spec's question language. Be brief and friendly.`;
}

export function physicsPaperPlanUserPrompt(messages: ChatMessage[], spec: PaperSpec) {
  const chat = messages.map((m) => `${m.role === "user" ? "Student" : "You"}: ${m.text}`).join("\n\n");
  return `Current spec (JSON):\n${JSON.stringify(spec)}\n\nConversation so far:\n${chat}\n\nWrite your next message and the updated spec.`;
}
