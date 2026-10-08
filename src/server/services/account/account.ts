import { and, eq, ne } from "drizzle-orm";
import type { z } from "zod";
import type { ProfilePatchSchema } from "@/server/api/routes/me";
import type { SessionUser } from "@/server/api/context";
import type { Db } from "@/server/db/client";
import { profiles, users } from "@/server/db/schema";
import { ApiError } from "@/server/errors";
import { deleteUserFiles } from "@/server/storage/storage";
import { creditBalance } from "../credits/credits";

export async function getProfile(db: Db, userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (profile) return profile;
  // Safety net for accounts created before the profile hook existed.
  const [created] = await db.insert(profiles).values({ userId, displayName: "Student" }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(profiles).where(eq(profiles.userId, userId)))[0];
}

export async function getMe(db: Db, user: SessionUser) {
  return { user, profile: await getProfile(db, user.id), credits: await creditBalance(db, user.id) };
}

export async function updateProfile(db: Db, userId: string, patch: z.infer<typeof ProfilePatchSchema>) {
  await getProfile(db, userId);
  if (patch.nickname) {
    const [taken] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(and(eq(profiles.nickname, patch.nickname), ne(profiles.userId, userId)));
    if (taken) throw new ApiError(409, "conflict", "That nickname is taken.");
  }
  const [updated] = await db.update(profiles).set(patch).where(eq(profiles.userId, userId)).returning();
  return updated;
}

/** Deletes the account and, by cascade, every row of the student's data, then their uploaded files. */
export async function deleteAccount(db: Db, userId: string) {
  await db.delete(users).where(eq(users.id, userId));
  await deleteUserFiles(userId);
}
