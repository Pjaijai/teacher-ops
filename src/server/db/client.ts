import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cloudflareEnv } from "@/server/env";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let nodeDb: Promise<Db> | null = null;

/**
 * The database for this request:
 * - on Cloudflare: Postgres (Railway) through Hyperdrive, a fresh client per request (Hyperdrive pools);
 * - in Node with DATABASE_URL: one shared postgres.js pool;
 * - in Node without DATABASE_URL: an embedded PGlite database in ./data/pglite (local dev and tests).
 */
export async function getDb(): Promise<Db> {
  const hyperdrive = cloudflareEnv()?.HYPERDRIVE;
  if (hyperdrive) {
    const client = postgres(hyperdrive.connectionString, { max: 5, fetch_types: false, prepare: false });
    return drizzlePostgres(client, { schema }) as unknown as Db;
  }
  nodeDb ??= openNodeDb();
  return nodeDb;
}

async function openNodeDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) return drizzlePostgres(postgres(url, { max: 10 }), { schema }) as unknown as Db;
  const { openPglite } = await import("./pglite");
  return openPglite();
}
