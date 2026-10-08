import type { z } from "zod";
import type { ReferenceGenerateSchema } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import type { Db } from "@/server/db/client";
import { forbidden, invalid } from "@/server/errors";
import { startJob } from "@/server/jobs/job-runner";
import { chargeCredits } from "@/server/services/credits/credits";
import { ownsKey } from "@/server/storage/storage";
import { SUBJECT_PROFILES } from "@/server/ai/prompts/math-rules";

/** From-reference flow: understand (2 credits) → student edits → generate variants (2 credits each). */

function assertMathSubject(subject: Subject) {
  if (!SUBJECT_PROFILES[subject] && subject !== "physics") throw invalid("Reference questions are supported for Maths (CP, M1, M2) and Physics.");
}

export async function startReferenceUnderstand(db: Db, userId: string, input: { subject: Subject; uploadKeys?: string[]; text?: string }) {
  assertMathSubject(input.subject);
  const uploadKeys = input.uploadKeys ?? [];
  if (uploadKeys.some((k) => !ownsKey(userId, k))) throw forbidden("You can only use your own uploads.");
  const credits = await chargeCredits(db, userId, "reference_understand");
  const jobId = await startJob(db, {
    userId,
    kind: "reference_understand",
    resourceRef: `ref_${userId}`,
    input: { subject: input.subject, uploadKeys, text: input.text ?? "" },
    credits,
  });
  return { jobId };
}

export async function startReferenceGenerate(db: Db, userId: string, input: z.infer<typeof ReferenceGenerateSchema>) {
  assertMathSubject(input.subject);
  const credits = await chargeCredits(db, userId, "reference_generate", { units: input.count });
  const jobId = await startJob(db, { userId, kind: "reference_generate", resourceRef: `ref_${userId}`, input, credits });
  return { jobId };
}
