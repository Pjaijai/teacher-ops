import { z } from "zod";
import type { QuestionContent } from "@/lib/schemas/question";
import { CHINESE_PART_A } from "./writing-rubric-text";

/** The task as the model sees it in every writing prompt (helpers, feedback, estimate, sample). */
export function writingTaskBlock(q: { subject: string; title: string; part: string | null; content: QuestionContent }) {
  const w = q.content.writing;
  const lines = [
    `Subject: ${q.subject === "chi_writing" ? "HKDSE 中國語文 卷二 寫作" : "HKDSE English Language Paper 2 (Writing)"}`,
    `Part: ${w?.part ?? q.part ?? "unknown"}`,
    w?.genre ? `Genre: ${w.genre}` : null,
    w?.textType ? `Text type: ${w.textType}` : null,
    w?.wordLimit ? `Length: ${q.subject === "chi_writing" ? `${w.wordLimit}字` : `about ${w.wordLimit} words`}` : null,
    `Title: ${q.title}`,
    `Task:\n${q.content.stem}`,
    q.content.materials ? `Materials:\n${q.content.materials}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export const GeneratedWritingTaskSchema = z.object({
  title: z.string().describe("Short title for lists, e.g. 〈為不完美添色彩〉 or 'Letter to the editor: dogs in public places'"),
  stem: z.string().describe("The full task as printed for the candidate (Markdown)"),
  materials: z.string().nullable().describe("甲部 / Part A input materials (Markdown, several pieces separated by headings); null when none"),
  genre: z.string().nullable().describe("Chinese 乙部 genre (記敘／議論／抒情／描寫／說明), else null"),
  textType: z.string().nullable().describe("Text type (書信／演講辭／… or letter / blog post / …), else null"),
  wordLimit: z.number().nullable().describe("Chinese 甲部 550; English Part A ~200, Part B ~400; Chinese 乙部 null"),
  taskAnalysis: z.string().describe("解題 (Markdown): what the task asks, audience, purpose, register, traps, what to prepare"),
  tips: z.array(z.string()).describe("3–5 short tips and common traps"),
});

const CHINESE_PATTERNS = `HKDSE 中國語文卷二 題目模式（2024年起，從考評局示例歸納）：
乙部 命題寫作（約1.5小時，字數不限，550字以下有內容上限）：
- 題目式：一個含意可深化的題目，常有象徵或雙關，例如〈藏在泥土中的寶物〉〈我最想尋回的玩具〉〈無愧的選擇〉。
- 情境材料式：題目加一兩段情境材料，要求考生結合材料抒發或議論，例如〈為不完美添色彩〉附兩則生活情境。
- 兩說並陳式：給出兩種看法（如「遵守諾言是具誠信的表現」與「有時候，放棄諾言也是負責任的行為」），要求考生談看法。
- 題目須留空間讓 L5 考生深化立意（由事入理、象徵、正反論證），亦讓一般考生能寫。
- 可寫明「文體不限」或指定「議論」等；記敘抒情題常要求「記述一次經歷，並抒發感受」。
甲部 實用寫作（約45分鐘，550字限，標點計算在內）：
- 提供2–3則材料（如學校通告、會議紀錄摘要、問卷結果、新聞報道、同學意見），要求考生以指定身份、對象、文體（書信／評論／建議書／演講辭／報告／專題文章）完成任務。
- 任務須要求整合材料、回應語境（身份、對象、目的），並有取捨；不可要求杜撰材料以外的事實。
${CHINESE_PART_A}`;

const ENGLISH_PATTERNS = `HKDSE English Language Paper 2 task patterns (2024+ format, from HKEAA exemplars):
Part A (compulsory, guided, about 200 words; may be split, e.g. 150 + 50):
- A realistic situation with a named persona (use an alias such as Chris Wong), a clear purpose and audience, and input to use: an advert, an email, notes, survey results, a web page outline.
- Examples: a complaint email to a hotel manager whose room didn't match the website advert; a web page or leaflet for a teen art club (background / a member's most memorable experience / future activities).
- Every input point must be needed in the answer; include 2–4 bullet points the candidate must cover.
Part B (one of four questions, about 400 words, text types vary year to year):
- Text types: essay, blog post, letter to the editor, school magazine article, short story, speech, proposal, report.
- Examples: an essay on why having fewer children is more desirable now; a letter to the editor on whether Hong Kong has gone too far in being dog-friendly; a short story about meeting a reformed old classmate at a theme park; an essay on the challenges of group work in the workplace and how to overcome them; a blog post about being vegetarian for a week.
- Prompts are 3–6 sentences: context, the role and reader, and what to discuss (often two parts, e.g. challenges AND solutions). Topical and relevant to Hong Kong teenagers.`;

export function generateTaskSystem(subject: "chi_writing" | "eng_writing") {
  if (subject === "chi_writing") {
    return `你是香港中學文憑試中國語文科卷二的命題員。請按以下題目模式，擬寫一道全新的、原創的寫作題目（不可抄錄真實試題）。
${CHINESE_PATTERNS}
要求：
- 全部用繁體中文。stem 是考生看到的題目全文；甲部的材料放在 materials（每則材料以小標題分開），乙部 materials 一般為 null，情境材料式則放情境材料。
- taskAnalysis 是「解題」：題目要求甚麼、文體、對象與目的、語氣、審題陷阱、寫作前要準備甚麼。不要提供範文或完整段落。
- tips 3–5 條，短而具體。`;
  }
  return `You are an HKDSE English Language Paper 2 setter. Write ONE brand-new, original writing task (never copy a real paper) following these patterns:
${ENGLISH_PATTERNS}
Rules:
- stem is the full task as printed. Part A input material goes in materials (Markdown); Part B usually has materials null.
- taskAnalysis explains what the task asks, the text type and its conventions, the audience, purpose, tone and register, traps, and what to prepare. Never write a model answer or full paragraphs.
- tips: 3–5 short, specific tips and traps.`;
}
