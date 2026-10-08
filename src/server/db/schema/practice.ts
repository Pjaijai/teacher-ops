import { boolean, index, integer, jsonb, numeric, pgTable, primaryKey, smallint, text, timestamp } from "drizzle-orm/pg-core";
import type { TrackedEdit } from "@/lib/schemas/writing";
import { users } from "./auth";
import { createdAt, id } from "./columns";
import { visibilityEnum } from "./enums";
import { questions } from "./questions";

export type TranscriptLine = { latex: string };

export const attempts = pgTable(
  "attempts",
  {
    id: id("att"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    /** answering → transcribing → review → marking → marked */
    status: text("status").notNull().default("answering"),
    mcChoice: text("mc_choice"),
    mcCorrect: boolean("mc_correct"),
    aiTranscript: jsonb("ai_transcript").$type<TranscriptLine[]>(),
    editedTranscript: jsonb("edited_transcript").$type<TranscriptLine[]>(),
    edits: jsonb("edits").$type<TrackedEdit[]>().notNull().default([]),
    score: numeric("score"),
    maxScore: numeric("max_score"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    createdAt: createdAt(),
    markedAt: timestamp("marked_at", { withTimezone: true }),
  },
  (t) => [index("attempts_user").on(t.userId, t.createdAt)],
);

export const attemptPages = pgTable(
  "attempt_pages",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    pageNo: smallint("page_no").notNull(),
    storageKey: text("storage_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.pageNo] })],
);

/** One row per mark in the scheme (M or A), with the reason it was awarded or lost. */
export const attemptMarks = pgTable(
  "attempt_marks",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    part: text("part").notNull(),
    markIndex: smallint("mark_index").notNull(),
    type: text("type").notNull(), // M | A
    awarded: boolean("awarded").notNull(),
    reason: text("reason").notNull(),
    studentLine: integer("student_line"),
    ecfFrom: text("ecf_from"),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.part, t.markIndex] })],
);

export const attemptParts = pgTable(
  "attempt_parts",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    part: text("part").notNull(),
    firstWrongLine: integer("first_wrong_line"),
    note: text("note").notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.part] })],
);

export const markDisputes = pgTable("mark_disputes", {
  id: id("dsp"),
  attemptId: text("attempt_id")
    .notNull()
    .references(() => attempts.id, { onDelete: "cascade" }),
  part: text("part").notNull(),
  markIndex: smallint("mark_index"),
  studentReason: text("student_reason").notNull(),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: createdAt(),
});
