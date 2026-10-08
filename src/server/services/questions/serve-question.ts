import { and, eq, isNull, sql } from "drizzle-orm";
import type { NextQuestionInput } from "@/lib/schemas/question";
import { isWritingSubject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";
import { questionViews, questions } from "@/server/db/schema";
import { startJob } from "@/server/jobs/job-runner";
import { chargeCredits, refundCredits } from "../credits/credits";
import { getProfile } from "../account/account";
import { markViewed } from "./question-bank";

export type NextResult = { questionId: string; jobId?: undefined } | { jobId: string; questionId?: undefined };

/** Serve an unseen bank question (free), or charge and start a generation job. */
export async function nextQuestion(db: Db, userId: string, input: NextQuestionInput): Promise<NextResult> {
  const profile = await getProfile(db, userId);
  // Writing tasks follow the subject's language; maths follows the exam language.
  const language = input.language ?? (input.subject === "chi_writing" ? "zh" : input.subject === "eng_writing" ? "en" : profile.examLanguage);

  if (!input.forceNew) {
    const w = [
      eq(questions.status, "active"),
      isNull(questions.ownerId),
      eq(questions.subject, input.subject),
      eq(questions.kind, input.kind),
      eq(questions.language, language),
      sql`${questions.difficulty} between ${input.difficulty - 1} and ${input.difficulty + 1}`,
      sql`not exists (select 1 from ${questionViews} where ${questionViews.questionId} = ${questions.id} and ${questionViews.userId} = ${userId})`,
    ];
    if (input.topicIds.length) w.push(sql`${questions.topicIds} && ARRAY[${sql.join(input.topicIds.map((t) => sql`${t}`), sql`, `)}]::text[]`);
    if (input.part) w.push(eq(questions.part, input.part));
    if (!isWritingSubject(input.subject)) w.push(eq(questions.extension, input.extension));
    const [hit] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(...w))
      .orderBy(sql`abs(${questions.difficulty} - ${input.difficulty})`, sql`random()`)
      .limit(1);
    if (hit) {
      await markViewed(db, userId, hit.id);
      return { questionId: hit.id };
    }
  }

  const charged = await chargeCredits(db, userId, "new_question");
  try {
    const jobId = await startJob(db, {
      userId,
      kind: "generate_question",
      resourceRef: input.topicIds[0] ?? input.subject,
      input: { ...input, language },
      credits: charged,
    });
    return { jobId };
  } catch (e) {
    await refundCredits(db, userId, charged, null);
    throw e;
  }
}
