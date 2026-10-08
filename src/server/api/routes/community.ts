import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { answerBySource, publishAnswer, updateAnswer } from "@/server/services/community/publish-answer";
import { reportAnswer, voteAnswer } from "@/server/services/community/vote-answer";
import { requireUser, type AppEnv } from "../context";

const PublishSchema = z.object({
  sourceType: z.enum(["writing", "attempt"]),
  sourceId: z.string().min(1),
  includeScore: z.boolean().default(false),
  includeFeedback: z.boolean().default(false),
});
const PatchSchema = z.union([
  z.object({ visibility: z.literal("private") }),
  z.object({ republish: z.literal(true), includeScore: z.boolean().optional(), includeFeedback: z.boolean().optional() }),
]);
const ReportSchema = z.object({ reason: z.enum(["wrong", "inappropriate", "personal_info"]), note: z.string().max(500).optional() });

export const communityRoutes = new Hono<AppEnv>()
  .get("/answers/by-source", zValidator("query", z.object({ sourceId: z.string().min(1) })), async (c) => {
    const user = requireUser(c);
    return c.json({ answer: await answerBySource(c.get("db"), user.id, c.req.valid("query").sourceId) });
  })
  .post("/answers", zValidator("json", PublishSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await publishAnswer(c.get("db"), user.id, c.req.valid("json")));
  })
  .patch("/answers/:id", zValidator("json", PatchSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await updateAnswer(c.get("db"), user.id, c.req.param("id"), c.req.valid("json")));
  })
  .put("/answers/:id/vote", zValidator("json", z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) })), async (c) => {
    const user = requireUser(c);
    return c.json(await voteAnswer(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").value));
  })
  .post("/answers/:id/report", zValidator("json", ReportSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await reportAnswer(c.get("db"), user.id, c.req.param("id"), c.req.valid("json")));
  });
