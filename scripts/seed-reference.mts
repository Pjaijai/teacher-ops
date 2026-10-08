/**
 * Load the topic tree (maths Learning Units, writing parts/genres/text types) into the database.
 * Idempotent: re-running updates names and objectives.
 *
 *   npm run db:seed            (local PGlite, or DATABASE_URL if set)
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../src/server/db/client";
import { topics } from "../src/server/db/schema";
import { CHI_WRITING_TOPICS, ENG_WRITING_TOPICS } from "../src/lib/writing-topics";

try { process.loadEnvFile(".env.local"); } catch { /* rely on the environment */ }

type SyllabusUnit = {
  id: string;
  subject: "math_cp" | "math_m1" | "math_m2";
  strand: string;
  nameEn: string;
  nameZh: string;
  foundation: string | null;
  extension: boolean;
  objectives: { id: string; textEn: string }[];
};

const db = await getDb();
const rows: (typeof topics.$inferInsert)[] = [];

for (const file of ["math-compulsory", "m1", "m2"]) {
  const units = JSON.parse(readFileSync(`syllabus/${file}.json`, "utf8")) as SyllabusUnit[];
  units.forEach((u, i) =>
    rows.push({
      id: u.id,
      subject: u.subject,
      parentId: null,
      kind: "unit",
      nameEn: u.nameEn,
      nameZh: u.nameZh,
      extension: u.extension,
      foundation: u.foundation,
      sortOrder: i,
      objectives: u.objectives,
    }),
  );
}
for (const [subject, list] of [["chi_writing", CHI_WRITING_TOPICS], ["eng_writing", ENG_WRITING_TOPICS]] as const) {
  list.forEach((t, i) => rows.push({ ...t, subject, sortOrder: i, objectives: [] }));
}

await db
  .insert(topics)
  .values(rows)
  .onConflictDoUpdate({
    target: topics.id,
    set: {
      nameEn: sql`excluded.name_en`,
      nameZh: sql`excluded.name_zh`,
      parentId: sql`excluded.parent_id`,
      kind: sql`excluded.kind`,
      foundation: sql`excluded.foundation`,
      sortOrder: sql`excluded.sort_order`,
      objectives: sql`excluded.objectives`,
    },
  });
console.log(`Seeded ${rows.length} topics.`);
process.exit(0);
