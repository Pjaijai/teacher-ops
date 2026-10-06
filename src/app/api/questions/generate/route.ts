import { askStructured, jsonRoute } from "@/lib/ai";
import { checkQuestion } from "@/lib/check";
import {
  GENERATE_SYSTEM,
  GeneratedSetSchema,
  fixPrompt,
  generatePrompt,
  type AnswerType,
  type Language,
  type Level,
  type Understanding,
} from "@/lib/questions";

export async function POST(req: Request) {
  return jsonRoute(async () => {
    const body = (await req.json()) as {
      understanding: Understanding;
      level: Level;
      answerType: AnswerType;
      language: Language;
      count: number;
    };
    const count = Math.min(Math.max(Math.round(body.count) || 1, 1), 10);

    const { questions } = await askStructured({
      name: "question_set",
      system: GENERATE_SYSTEM,
      text: generatePrompt({ ...body, count }),
      schema: GeneratedSetSchema,
    });

    let results = questions.map((question) => ({ question, problems: checkQuestion(question, body.answerType) }));

    // One repair round for questions that failed the code check.
    const failed = results.filter((r) => r.problems.length > 0);
    if (failed.length > 0) {
      const fixed = await askStructured({
        name: "question_set",
        system: GENERATE_SYSTEM,
        text: fixPrompt(failed),
        schema: GeneratedSetSchema,
      }).catch(() => null);
      if (fixed && fixed.questions.length === failed.length) {
        results = results.map((r) => {
          const i = failed.indexOf(r);
          if (i < 0) return r;
          const question = fixed.questions[i];
          return { question, problems: checkQuestion(question, body.answerType) };
        });
      }
    }

    return { results };
  });
}
