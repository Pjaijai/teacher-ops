import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { CreateSubmissionSchema, EditTextSchema, HelperKindSchema, SampleSchema, SubmitSchema } from "@/lib/schemas/writing";
import { askHelper } from "@/server/services/writing/writing-helpers";
import {
  createOwnPrompt,
  createSubmission,
  getSubmissionView,
  getTaskView,
  listSubmissions,
  requestSample,
  retryTranscription,
  submitForFeedback,
  updateText,
} from "@/server/services/writing/submissions";
import { requireUser, type AppEnv } from "../context";

export const OwnPromptSchema = z.object({
  subject: z.enum(["chi_writing", "eng_writing"]),
  part: z.enum(["A", "B"]),
  text: z.string().trim().min(5).max(6000),
  materials: z.string().max(12000).nullish(),
  title: z.string().max(80).nullish(),
  textType: z.string().max(40).nullish(),
});

/** Writing: tasks, Ask-AI helpers, submissions (typed or photo), feedback, DSE estimate, level samples. */
export const writingRoutes = new Hono<AppEnv>()
  /** "My own question": a private writing task. */
  .post("/own-prompt", zValidator("json", OwnPromptSchema), async (c) => {
    const user = requireUser(c);
    const questionId = await createOwnPrompt(c.get("db"), user.id, c.req.valid("json"));
    return c.json({ questionId }, 201);
  })
  /** Task page data: question (student view), cached helpers, this student's submissions on it. */
  .get("/tasks/:questionId", async (c) => {
    const user = requireUser(c);
    return c.json(await getTaskView(c.get("db"), user.id, c.req.param("questionId")));
  })
  /** Ask AI (synchronous, light model). Cached per student + question: free the second time. */
  .post("/:questionId/helpers/:kind", zValidator("param", z.object({ questionId: z.string(), kind: HelperKindSchema })), async (c) => {
    const user = requireUser(c);
    const { questionId, kind } = c.req.valid("param");
    return c.json(await askHelper(c.get("db"), user.id, questionId, kind));
  })
  .get("/submissions", zValidator("query", z.object({ questionId: z.string().optional() })), async (c) => {
    const user = requireUser(c);
    return c.json({ items: await listSubmissions(c.get("db"), user.id, c.req.valid("query").questionId) });
  })
  /** Typed → review at once. Photo → 202 with the transcription job (3 credits per page). */
  .post("/submissions", zValidator("json", CreateSubmissionSchema), async (c) => {
    const user = requireUser(c);
    const result = await createSubmission(c.get("db"), user.id, c.req.valid("json"));
    return c.json(result, result.jobId ? 202 : 201);
  })
  .get("/submissions/:id", async (c) => {
    const user = requireUser(c);
    return c.json(await getSubmissionView(c.get("db"), user.id, c.req.param("id")));
  })
  .patch("/submissions/:id/text", zValidator("json", EditTextSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await updateText(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").editedText));
  })
  .post("/submissions/:id/transcribe", async (c) => {
    const user = requireUser(c);
    return c.json({ jobId: await retryTranscription(c.get("db"), user.id, c.req.param("id")) }, 202);
  })
  /** Feedback (8 credits) + optional DSE estimate (+5). */
  .post("/submissions/:id/submit", zValidator("json", SubmitSchema), async (c) => {
    const user = requireUser(c);
    return c.json({ jobId: await submitForFeedback(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").wantsEstimate) }, 202);
  })
  /** Level sample (10 credits). */
  .post("/submissions/:id/sample", zValidator("json", SampleSchema), async (c) => {
    const user = requireUser(c);
    return c.json({ jobId: await requestSample(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").targetLevel) }, 202);
  });
