import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getAuth } from "@/server/auth/auth";
import { AiError } from "@/server/ai/open-router";
import { ApiError } from "@/server/errors";
import type { AppEnv } from "./context";
import { isLocalMode } from "@/lib/app-mode";
import { withContext } from "./middleware/with-context";
import { aiRoutes } from "./routes/ai";
import { communityRoutes } from "./routes/community";
import { dashboardRoutes } from "./routes/dashboard";
import { jobRoutes } from "./routes/jobs";
import { meRoutes } from "./routes/me";
import { practiceRoutes } from "./routes/practice";
import { questionsRoutes } from "./routes/questions";
import { referenceRoutes } from "./routes/reference";
import { uploadRoutes } from "./routes/uploads";
import { writingRoutes } from "./routes/writing";

const app = new Hono<AppEnv>().basePath("/api");

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ error: err.code, message: err.message, ...err.extra }, err.status as 400);
  if (err instanceof AiError) return c.json({ error: "ai_failed", message: err.message }, err.status as 502);
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: "internal", message: "Something went wrong." }, 500);
});

// Stateless AI API (no sign-in, no database). Registered before the session middleware.
const withAi = app.route("/ai", aiRoutes);

// Local mode: no database or accounts. Everything below is switched off (kept for cloud mode).
app.use("*", async (c, next) => {
  if (isLocalMode) return c.json({ error: "not_found", message: "Not available in local mode." }, 404);
  await next();
});

// Better Auth owns /api/auth/* (sign-in, OTP, Google callback, sign-out).
app.on(["GET", "POST"], "/auth/*", async (c) => (await getAuth()).handler(c.req.raw));

app.use("*", withContext);

const routes = withAi
  .route("/me", meRoutes)
  .route("/reference", referenceRoutes)
  .route("/questions", questionsRoutes)
  .route("/writing", writingRoutes)
  .route("/practice", practiceRoutes)
  .route("/community", communityRoutes)
  .route("/dashboard", dashboardRoutes)
  .route("/uploads", uploadRoutes)
  .route("/jobs", jobRoutes);

export type AppType = typeof routes;
export default app;
