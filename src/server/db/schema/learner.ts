import { integer, jsonb, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, id } from "./columns";
import { subjectEnum } from "./enums";

/** Derived from submissions and attempts (rebuildable). EWMA with α = 0.35. */
export const criterionStats = pgTable(
  "criterion_stats",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: subjectEnum("subject").notNull(),
    part: text("part").notNull(),
    criterion: text("criterion").notNull(),
    ewma: numeric("ewma").notNull(), // 0..1
    attempts: integer("attempts").notNull(),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.subject, t.part, t.criterion] })],
);

export const errorTagStats = pgTable(
  "error_tag_stats",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: subjectEnum("subject").notNull(),
    tag: text("tag").notNull(),
    weighted: numeric("weighted").notNull(),
    total: integer("total").notNull(),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.subject, t.tag] })],
);

export const topicMastery = pgTable(
  "topic_mastery",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    ewma: numeric("ewma").notNull(),
    attempts: integer("attempts").notNull(),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })],
);

export const nextSteps = pgTable("next_steps", {
  id: id("ns"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subject: subjectEnum("subject").notNull(),
  kind: text("kind").notNull(), // revise | question | topic | helper
  target: jsonb("target").$type<Record<string, unknown>>().notNull(),
  rationale: text("rationale").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: createdAt(),
});
