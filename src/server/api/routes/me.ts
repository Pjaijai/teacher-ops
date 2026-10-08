import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { SubjectSchema } from "@/lib/schemas/question";
import { deleteAccount, getMe, updateProfile } from "@/server/services/account/account";
import { creditHistory } from "@/server/services/credits/credits";
import { requireUser, type AppEnv } from "../context";

export const ProfilePatchSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  nickname: z
    .string()
    .trim()
    .regex(/^[\p{L}\p{N}_-]{2,20}$/u, "2–20 letters, numbers, _ or -")
    .nullable()
    .optional(),
  form: z.number().int().min(4).max(6).nullable().optional(),
  subjects: z.array(SubjectSchema).optional(),
  examLanguage: z.enum(["zh", "en"]).optional(),
  uiLocale: z.enum(["zh-HK", "en"]).optional(),
  extensionTrack: z.boolean().optional(),
  onboarded: z.boolean().optional(),
});

export const meRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ user: null, profile: null, credits: null });
    return c.json(await getMe(c.get("db"), user));
  })
  .patch("/profile", zValidator("json", ProfilePatchSchema), async (c) => {
    const user = requireUser(c);
    return c.json(await updateProfile(c.get("db"), user.id, c.req.valid("json")));
  })
  .get("/credits/history", async (c) => {
    const user = requireUser(c);
    return c.json({ items: await creditHistory(c.get("db"), user.id) });
  })
  .delete("/", zValidator("json", z.object({ confirm: z.literal("DELETE") })), async (c) => {
    const user = requireUser(c);
    await deleteAccount(c.get("db"), user.id);
    return c.body(null, 204);
  });
