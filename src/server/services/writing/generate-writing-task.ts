import { CHI_WRITING_TOPICS, ENG_WRITING_TOPICS } from "@/lib/writing-topics";
import { modelFor } from "@/server/ai/models";
import { askStructured } from "@/server/ai/open-router";
import { GeneratedWritingTaskSchema, generateTaskSystem } from "@/server/ai/prompts/writing-task";
import { registerGenerator } from "@/server/services/questions/generators";
import type { NewQuestion } from "@/server/services/questions/question-bank";
import { displayPart, type WritingSubject } from "./writing-common";
import { DEFAULT_WORD_LIMIT, partFromRequest, partTopicId, writingContent } from "./writing-task-content";

/**
 * Writing-task generator for the shared bank (called inside the generate_question job owned by the
 * questions feature). Follows the distilled HKDSE task patterns; light model.
 */
registerGenerator(["chi_writing", "eng_writing"], async ({ input, onUsage }) => {
  const subject = input.subject as WritingSubject;
  const part = partFromRequest(subject, input.topicIds, input.part);
  const all = subject === "chi_writing" ? CHI_WRITING_TOPICS : ENG_WRITING_TOPICS;
  const partTopic = partTopicId(subject, part);
  const chosen = all.filter((t) => input.topicIds.includes(t.id) && t.kind !== "part");
  const ask = chosen.map((t) => `${t.nameZh} / ${t.nameEn}`).join(", ");

  const request =
    subject === "chi_writing"
      ? `請擬寫一道${displayPart(subject, part)}題目。${ask ? `${part === "A" ? "文體" : "文類"}：${ask}。` : "文類由你決定。"}難度：${input.difficulty}/5。`
      : `Write one Part ${part} task.${ask ? ` Text type: ${ask}.` : " Choose a suitable text type."} Difficulty: ${input.difficulty}/5.`;

  const g = await askStructured({
    purpose: "generate_writing_task",
    tier: "light",
    system: generateTaskSystem(subject),
    text: request,
    schema: GeneratedWritingTaskSchema,
    onUsage,
  });

  const problems: string[] = [];
  if (g.stem.trim().length < 10) problems.push("The task text is empty.");
  if (subject === "chi_writing" && part === "A" && !g.materials?.trim()) problems.push("甲部 needs materials.");
  if (subject === "eng_writing" && part === "A" && !g.materials?.trim() && g.stem.length < 200) problems.push("Part A needs input material.");

  const q: Omit<NewQuestion, "embedding"> = {
    subject,
    kind: "writing_task",
    language: subject === "chi_writing" ? "zh" : "en",
    title: g.title.trim(),
    topicIds: [...new Set([partTopic, ...chosen.map((t) => t.id)])],
    part: displayPart(subject, part),
    difficulty: input.difficulty,
    content: writingContent({
      stem: g.stem,
      materials: g.materials?.trim() || null,
      part: displayPart(subject, part),
      genre: g.genre,
      textType: g.textType,
      wordLimit: g.wordLimit ?? DEFAULT_WORD_LIMIT[subject][part],
      taskAnalysis: g.taskAnalysis,
      tips: g.tips,
    }),
    checkProblems: problems,
    generatedBy: modelFor("light"),
    origin: "bank",
  };
  return q;
});
