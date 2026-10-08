import { boolean, index, integer, numeric, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, id, updatedAt } from "./columns";
import { examLanguageEnum, localeEnum, subjectEnum } from "./enums";

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  nickname: text("nickname").unique(),
  form: smallint("form"),
  subjects: subjectEnum("subjects").array().notNull().default([]),
  examLanguage: examLanguageEnum("exam_language").notNull().default("en"),
  uiLocale: localeEnum("ui_locale").notNull().default("zh-HK"),
  extensionTrack: boolean("extension_track").notNull().default(true),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Append-only. Today's balance = DAILY_QUOTA + sum(delta) since 00:00 HKT. */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: id("cr"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    jobId: text("job_id"),
    createdAt: createdAt(),
  },
  (t) => [index("credit_ledger_user_time").on(t.userId, t.createdAt)],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: id("air"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    jobId: text("job_id"),
    purpose: text("purpose").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_runs_user_time").on(t.userId, t.createdAt)],
);
