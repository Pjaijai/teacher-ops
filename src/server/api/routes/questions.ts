import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { NextQuestionSchema, SearchQuerySchema } from "@/lib/schemas/question";
import { forbidden } from "@/server/errors";
import { listAnswers, hasOwnAnswer } from "@/server/services/community/list-answers";
import { hasAttempted, loadQuestion, markViewed, toPublic, toSolution } from "@/server/services/questions/question-bank";
import { rateQuestion } from "@/server/services/questions/ratings";
import { searchQuestions } from "@/server/services/questions/search-questions";
import { nextQuestion } from "@/server/services/questions/serve-question";
import { requireUser, type AppEnv } from "../context";

/** A single ?topic=x arrives as a string, repeated ones as an array. */
const SearchSchema = SearchQuerySchema.extend({
  topic: z.preprocess((v) => (v == null ? undefined : Array.isArray(v) ? v : [v]), z.array(z.string()).optional()),
});

const RatingSchema = z.union([z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }), z.object({ report: z.string().trim().min(1).max(300) })]);

export const questionsRoutes = new Hono<AppEnv>()
  .get("/search", zValidator("query", SearchSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await searchQuestions(c.get("db"), user.id, c.req.valid("query")));
  })
  .post("/next", zValidator("json", NextQuestionSchema), async (c) => {
    const user = requireUser(c);
    const r = await nextQuestion(c.get("db"), user.id, c.req.valid("json"));
    return r.jobId ? c.json({ jobId: r.jobId }, 202) : c.json({ questionId: r.questionId! });
  })
  .get("/:id", async (c) => {
    const user = requireUser(c);
    const db = c.get("db");
    const q = await loadQuestion(db, user.id, c.req.param("id"));
    await markViewed(db, user.id, q.id);
    return c.json({ ...toPublic(q), attempted: await hasAttempted(db, user.id, q.id) });
  })
  .get("/:id/solution", zValidator("query", z.object({ reveal: z.string().optional() })), async (c) => {
    const user = requireUser(c);
    const db = c.get("db");
    const q = await loadQuestion(db, user.id, c.req.param("id"));
    const done = (await hasAttempted(db, user.id, q.id)) || (await hasOwnAnswer(db, user.id, q.id));
    if (!done) {
      if (c.req.valid("query").reveal !== "1") throw forbidden("Attempt the question first, or choose to reveal the solution.");
      await markViewed(db, user.id, q.id, { revealedEarly: true });
    }
    return c.json(toSolution(q));
  })
  .post("/:id/rating", zValidator("json", RatingSchema), async (c) => {
    const user = requireUser(c);
    const db = c.get("db");
    const q = await loadQuestion(db, user.id, c.req.param("id"));
    return c.json(await rateQuestion(db, user.id, q.id, c.req.valid("json")));
  })
  .get("/:id/answers", zValidator("query", z.object({ sort: z.enum(["top", "new"]).default("top"), cursor: z.string().optional() })), async (c) => {
    const user = requireUser(c);
    const { sort, cursor } = c.req.valid("query");
    return c.json(await listAnswers(c.get("db"), user.id, c.req.param("id"), { sort, cursor }));
  });
