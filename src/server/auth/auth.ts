import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { getDb, type Db } from "@/server/db/client";
import { accounts, profiles, sessions, users, verifications } from "@/server/db/schema";
import { setting } from "@/server/env";
import { sendSignInCode } from "./send-email";

function createAuth(db: Db) {
  const googleId = setting("GOOGLE_CLIENT_ID");
  const googleSecret = setting("GOOGLE_CLIENT_SECRET");
  return betterAuth({
    secret: setting("BETTER_AUTH_SECRET") ?? "dev-only-secret-change-me-dev-only-secret",
    baseURL: setting("BETTER_AUTH_URL") ?? "http://localhost:3000",
    basePath: "/api/auth",
    trustedOrigins: [
      ...(setting("BETTER_AUTH_TRUSTED_ORIGINS")?.split(",") ?? []),
      ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://localhost:3100"] : []),
    ],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    socialProviders: googleId && googleSecret ? { google: { clientId: googleId, clientSecret: googleSecret } } : {},
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        sendVerificationOTP: async ({ email, otp }) => sendSignInCode(email, otp),
      }),
    ],
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    databaseHooks: {
      user: {
        create: {
          // Every account gets a profile; onboarding fills in form, subjects and exam language.
          after: async (user) => {
            await db
              .insert(profiles)
              .values({ userId: user.id, displayName: user.name || user.email.split("@")[0] })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Auth bound to this request's database (on Workers each request gets its own Hyperdrive client). */
export async function getAuth(): Promise<Auth> {
  return createAuth(await getDb());
}

export function googleEnabled() {
  return Boolean(setting("GOOGLE_CLIENT_ID") && setting("GOOGLE_CLIENT_SECRET"));
}
