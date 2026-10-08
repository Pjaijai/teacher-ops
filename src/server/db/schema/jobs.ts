import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, id } from "./columns";
import { jobKindEnum, jobStatusEnum } from "./enums";

export type JobProgress = { step: string; status: "running" | "done" | "failed"; at: string };

/** Long AI work. The UI follows `progress` over /api/jobs/:id/stream. */
export const jobs = pgTable(
  "jobs",
  {
    id: id("job"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: jobKindEnum("kind").notNull(),
    status: jobStatusEnum("status").notNull().default("queued"),
    /** What the job works on: sub_…, att_…, q_… */
    resourceRef: text("resource_ref").notNull(),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    /** What it produced (e.g. a new question id) */
    output: jsonb("output").$type<Record<string, unknown>>(),
    progress: jsonb("progress").$type<JobProgress[]>().notNull().default([]),
    error: text("error"),
    creditsCharged: integer("credits_charged").notNull().default(0),
    createdAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("jobs_user_time").on(t.userId, t.createdAt)],
);
