/**
 * "local": no database and no sign-in. Students' work lives in their browser (IndexedDB) and the
 * server only runs stateless AI calls (/api/ai/*). "cloud": accounts, Postgres, credits, the shared
 * bank and community answers. Set NEXT_PUBLIC_APP_MODE at build time; local is the default for now.
 */
export type AppMode = "local" | "cloud";

export const APP_MODE: AppMode = process.env.NEXT_PUBLIC_APP_MODE === "cloud" ? "cloud" : "local";
export const isLocalMode = APP_MODE === "local";
