import type { Context } from "hono";
import type { Db } from "@/server/db/client";
import { ApiError } from "@/server/errors";

export type SessionUser = { id: string; email: string; name: string };

export type AppEnv = {
  Variables: {
    db: Db;
    user: SessionUser | null;
  };
};

/** The signed-in student, or 401. Services always take the user id from here, never from the request body. */
export function requireUser(c: Context<AppEnv>): SessionUser {
  const user = c.get("user");
  if (!user) throw new ApiError(401, "unauthorized", "Please sign in.");
  return user;
}
