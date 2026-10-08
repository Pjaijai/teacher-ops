import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { SubjectSchema } from "@/lib/schemas/question";
import { getDashboard, setNextStepStatus } from "@/server/services/learner/dashboard";
import { listHistory } from "@/server/services/history/list-history";
import { requireUser, type AppEnv } from "../context";

export const dashboardRoutes = new Hono<AppEnv>()
  .get("/history", zValidator("query", z.object({ type: z.enum(["writing", "practice"]).optional(), cursor: z.string().optional() })), async (c) => {
    const user = requireUser(c);
    return c.json(await listHistory(c.get("db"), user.id, c.req.valid("query")));
  })
  .get("/", zValidator("query", z.object({ subject: SubjectSchema })), async (c) => {
    const user = requireUser(c);
    return c.json(await getDashboard(c.get("db"), user.id, c.req.valid("query").subject));
  })
  .patch("/next-steps/:id", zValidator("json", z.object({ status: z.enum(["open", "done", "dismissed"]) })), async (c) => {
    const user = requireUser(c);
    return c.json(await setNextStepStatus(c.get("db"), user.id, c.req.param("id"), c.req.valid("json").status));
  });
