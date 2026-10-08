import { createId } from "@paralleldrive/cuid2";
import { text, timestamp, vector } from "drizzle-orm/pg-core";

/** Readable prefixed ids: usr_…, q_…, sub_… (also valid in URLs and logs). */
export const newId = (prefix: string) => `${prefix}_${createId()}`;

export const id = (prefix: string) =>
  text("id")
    .primaryKey()
    .$defaultFn(() => newId(prefix));

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/**
 * Embedding width. qwen3-embedding is Matryoshka-trained, so we keep the first 1024 dimensions
 * (pgvector's HNSW index supports at most 2000). Changing it means a migration + re-embed.
 */
export const EMBEDDING_DIMS = 1024;
export const embedding = (name = "embedding") => vector(name, { dimensions: EMBEDDING_DIMS });
