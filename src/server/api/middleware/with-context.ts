import { createMiddleware } from "hono/factory";
import { getAuth } from "@/server/auth/auth";
import { getDb } from "@/server/db/client";
import type { AppEnv } from "../context";

/** Per request: the database client and the session user (null when signed out). */
export const withContext = createMiddleware<AppEnv>(async (c, next) => {
  c.set("db", await getDb());
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
  c.set("user", session ? { id: session.user.id, email: session.user.email, name: session.user.name } : null);
  await next();
});
