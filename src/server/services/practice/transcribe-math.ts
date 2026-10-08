import { MathTranscriptSchema } from "@/lib/schemas/practice";
import { askStructured, type ImageInput, type UsageSink } from "@/server/ai/open-router";
import { TRANSCRIBE_MATH_SYSTEM, transcribeUserPrompt } from "@/server/ai/prompts/math-transcribe";

/** Handwritten working → LaTeX lines, exactly as written (top model). */
export async function transcribeMath(opts: { images: ImageInput[]; questionStem: string; onUsage?: UsageSink }) {
  const out = await askStructured({
    purpose: "transcribe_math",
    tier: "top",
    system: TRANSCRIBE_MATH_SYSTEM,
    text: transcribeUserPrompt(opts.images.length, opts.questionStem),
    images: opts.images,
    schema: MathTranscriptSchema,
    onUsage: opts.onUsage,
  });
  return out.lines
    .map((l) => ({ latex: l.latex.replace(/^\s*\$+|\$+\s*$/g, "").trim() }))
    .filter((l) => l.latex.length > 0);
}
