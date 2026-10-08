import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { SUBJECTS, type Subject } from "@/lib/subjects";
import { topics } from "@/server/db/schema";
import { invalid } from "@/server/errors";
import type { AppEnv } from "../context";

export const referenceRoutes = new Hono<AppEnv>().get("/topics", async (c) => {
  const subject = c.req.query("subject") as Subject | undefined;
  if (subject && !SUBJECTS.includes(subject)) throw invalid("Unknown subject");
  const db = c.get("db");
  const rows = await db
    .select({
      id: topics.id,
      subject: topics.subject,
      parentId: topics.parentId,
      kind: topics.kind,
      nameEn: topics.nameEn,
      nameZh: topics.nameZh,
      extension: topics.extension,
      foundation: topics.foundation,
    })
    .from(topics)
    .where(subject ? eq(topics.subject, subject) : undefined)
    .orderBy(asc(topics.sortOrder));
  c.header("Cache-Control", "public, max-age=3600");
  return c.json({ items: rows });
});
