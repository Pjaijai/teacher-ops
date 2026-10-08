import type { ImageInput, UsageSink } from "@/server/ai/open-router";
import { askStructured } from "@/server/ai/open-router";
import { WritingTranscriptionSchema, transcribeSystem } from "@/server/ai/prompts/writing-transcribe";
import type { WritingSubject } from "./writing-common";

/**
 * Exact transcription of handwritten pages (top model): keeps the student's errors and script,
 * marks unsure [X?] and malformed [X!] characters, applies ∨/⋀ insertions as {+…+}.
 */
export async function transcribeWriting(opts: { subject: WritingSubject; images: ImageInput[]; onUsage: UsageSink }) {
  return askStructured({
    purpose: "transcribe_writing",
    tier: "top",
    system: transcribeSystem(opts.subject),
    text: `Transcribe this ${opts.subject === "chi_writing" ? "essay" : "composition"} (${opts.images.length} page${opts.images.length > 1 ? "s" : ""}, in order) exactly as written.`,
    images: opts.images,
    schema: WritingTranscriptionSchema,
    onUsage: opts.onUsage,
  });
}
