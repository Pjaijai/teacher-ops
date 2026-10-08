import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  CreateAttemptSchema,
  DisputeSchema,
  McAnswerSchema,
  ReferenceGenerateSchema,
  ReferenceUnderstandSchema,
  TranscriptSchema,
  UploadPagesSchema,
} from "@/lib/schemas/practice";
import {
  answerMc,
  createAttempt,
  getAttemptDetail,
  getPracticeQuestion,
  listAttempts,
  saveTranscript,
  startMarking,
  submitPages,
} from "@/server/services/practice/attempts";
import { createDispute } from "@/server/services/practice/disputes";
import { startReferenceGenerate, startReferenceUnderstand } from "@/server/services/practice/reference-flow";
import { requireUser, type AppEnv } from "../context";

/** Practice (maths now; M1/M2/Physics later): attempts, MC, photo answers, AI marking, disputes, from-reference. */
export const practiceRoutes = new Hono<AppEnv>()
  // From a reference image or text
  .post("/reference/understand", zValidator("json", ReferenceUnderstandSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await startReferenceUnderstand(c.get("db"), user.id, c.req.valid("json")), 202);
  })
  .post("/reference/generate", zValidator("json", ReferenceGenerateSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await startReferenceGenerate(c.get("db"), user.id, c.req.valid("json")), 202);
  })
  // The question page: question + my attempts + solution once attempted
  .get("/questions/:id", async (c) => {
    const user = requireUser(c);
    return c.json(await getPracticeQuestion(c.get("db"), user.id, c.req.param("id")));
  })
  // Attempts
  .get("/attempts", async (c) => {
    const user = requireUser(c);
    const limit = Number(c.req.query("limit") ?? 20);
    return c.json({
      items: await listAttempts(c.get("db"), user.id, { questionId: c.req.query("questionId") || undefined, limit: Number.isFinite(limit) ? limit : 20 }),
    });
  })
  .post("/attempts", zValidator("json", CreateAttemptSchema), async (c) => {
    const user = requireUser(c);
    const a = await createAttempt(c.get("db"), user.id, c.req.valid("json").questionId);
    return c.json({ id: a.id, questionId: a.questionId, status: a.status }, 201);
  })
  .get("/attempts/:id", async (c) => {
    const user = requireUser(c);
    return c.json(await getAttemptDetail(c.get("db"), user.id, c.req.param("id")));
  })
  .post("/attempts/:id/mc", zValidator("json", McAnswerSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await answerMc(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").choice));
  })
  .post("/attempts/:id/pages", zValidator("json", UploadPagesSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await submitPages(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").uploadKeys), 202);
  })
  .patch("/attempts/:id/transcript", zValidator("json", TranscriptSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await saveTranscript(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").lines));
  })
  .post("/attempts/:id/mark", async (c) => {
    const user = requireUser(c);
    return c.json(await startMarking(c.get("db"), user.id, c.req.param("id")), 202);
  })
  .post("/attempts/:id/disputes", zValidator("json", DisputeSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await createDispute(c.get("db"), user.id, c.req.param("id"), c.req.valid("json")), 201);
  });
