import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "./client";
import * as schema from "./schema";

/** Embedded Postgres (WASM) for local development and tests, migrated on open. */
export async function openPglite(dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), "data", "pglite")): Promise<Db> {
  if (dataDir !== ":memory:") mkdirSync(dataDir, { recursive: true });
  const client = await PGlite.create({ dataDir: dataDir === ":memory:" ? undefined : dataDir, extensions: { vector, pg_trgm } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}
