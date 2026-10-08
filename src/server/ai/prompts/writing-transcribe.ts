import { z } from "zod";

export const WritingTranscriptionSchema = z.object({
  title: z.string().nullable().describe("The essay title if the student wrote one, else null"),
  text: z
    .string()
    .describe("The text exactly as written, with [X?], [X!] and {+…+} markers; paragraphs separated by one blank line"),
});
export type WritingTranscription = z.infer<typeof WritingTranscriptionSchema>;

const CHINESE = `You transcribe handwritten Chinese essays by Hong Kong secondary students (usually on 原稿紙 grid paper, written left-to-right).
The transcription is used to find the student's wrong characters (錯別字), so copy EXACTLY what the student wrote, character by character:
- NEVER correct anything. If the student wrote 己 where 已 is meant, write 己. Keep wrong words, wrong punctuation and odd grammar exactly.
- Keep the student's script: traditional, simplified, or a mix. Never convert between scripts.
- A malformed character that is not a real character (an extra or missing stroke or component, 繁簡同體): write the intended character followed by "!" in brackets, e.g. [武!].
- A character you cannot read with confidence: your best reading followed by "?" in brackets, e.g. [已?]. Use this whenever you are unsure — the student will check these.
- Insertions: when the student added words between lines or above the line with a ∨ or ⋀ mark, put the inserted words where they belong, wrapped as {+inserted words+}.
- Skip crossed-out text and any teacher marks.
- Keep the student's paragraphs (a new paragraph starts with indented empty squares); separate paragraphs with one blank line.
- Put the title (if written) in "title"; do not repeat it in "text".
- Pages are given in order; continue the text across pages.`;

const ENGLISH = `You transcribe handwritten English compositions by Hong Kong secondary students (HKDSE English Paper 2).
The transcription is used to give feedback on grammar and spelling, so copy EXACTLY what the student wrote, word by word:
- NEVER correct anything: keep spelling mistakes ("hotal"), wrong verb forms, wrong punctuation, capitalisation and odd grammar exactly.
- A word you cannot read with confidence: your best reading followed by "?" in brackets, e.g. [necessary?].
- Insertions: words added between lines or above the line with a ∨ or ⋀ caret go where they belong, wrapped as {+inserted words+}.
- Skip crossed-out text and any teacher marks.
- Keep the student's paragraphs; separate paragraphs with one blank line. Keep salutations, headings and sign-offs as written.
- Put the title (if written) in "title"; do not repeat it in "text".
- Pages are given in order; continue the text across pages.`;

export const transcribeSystem = (subject: "chi_writing" | "eng_writing") => (subject === "chi_writing" ? CHINESE : ENGLISH);
