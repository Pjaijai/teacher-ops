import { boolean, index, integer, jsonb, numeric, pgTable, primaryKey, smallint, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { TrackedEdit } from "@/lib/schemas/writing";
import { users } from "./auth";
import { createdAt, id } from "./columns";
import { feedbackKindEnum, helperKindEnum, visibilityEnum } from "./enums";
import { questions } from "./questions";

/** Cached Ask-AI outputs (解題, outline, vocabulary, …) per student per question. */
export const writingHelpers = pgTable(
  "writing_helpers",
  {
    id: id("wh"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    kind: helperKindEnum("kind").notNull(),
    content: jsonb("content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("writing_helpers_once").on(t.userId, t.questionId, t.kind)],
);

export const writingSubmissions = pgTable(
  "writing_submissions",
  {
    id: id("sub"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    /** draft → transcribing → review → grading → graded */
    status: text("status").notNull().default("draft"),
    inputMode: text("input_mode").notNull(), // typed | photo
    wantsEstimate: boolean("wants_estimate").notNull().default(false),
    aiText: text("ai_text"),
    editedText: text("edited_text"),
    edits: jsonb("edits").$type<TrackedEdit[]>().notNull().default([]),
    dominantScript: text("dominant_script"), // trad | simp
    charCount: integer("char_count"),
    overallComment: text("overall_comment"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    parentSubmissionId: text("parent_submission_id"),
    createdAt: createdAt(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [index("writing_submissions_user").on(t.userId, t.createdAt)],
);

export const submissionPages = pgTable(
  "submission_pages",
  {
    submissionId: text("submission_id")
      .notNull()
      .references(() => writingSubmissions.id, { onDelete: "cascade" }),
    pageNo: smallint("page_no").notNull(),
    storageKey: text("storage_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.pageNo] })],
);

export const writingFeedback = pgTable(
  "writing_feedback",
  {
    id: id("fb"),
    submissionId: text("submission_id")
      .notNull()
      .references(() => writingSubmissions.id, { onDelete: "cascade" }),
    kind: feedbackKindEnum("kind").notNull(),
    startPos: integer("start_pos"),
    endPos: integer("end_pos"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    tags: text("tags").array().notNull().default([]),
    criterion: text("criterion"),
  },
  (t) => [index("writing_feedback_submission").on(t.submissionId)],
);

export const writingScores = pgTable(
  "writing_scores",
  {
    submissionId: text("submission_id")
      .notNull()
      .references(() => writingSubmissions.id, { onDelete: "cascade" }),
    part: text("part").notNull(),
    criterion: text("criterion").notNull(),
    grade: text("grade").notNull(),
    marks: numeric("marks").notNull(),
    maxMarks: numeric("max_marks").notNull(),
    reason: text("reason").notNull(),
    anchorIds: text("anchor_ids").array().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.part, t.criterion] })],
);

export const writingEstimates = pgTable("writing_estimates", {
  submissionId: text("submission_id")
    .primaryKey()
    .references(() => writingSubmissions.id, { onDelete: "cascade" }),
  totalMarks: numeric("total_marks").notNull(),
  maxMarks: numeric("max_marks").notNull(),
  level: smallint("level").notNull(),
  levelReason: text("level_reason").notNull(),
});

export const levelSamples = pgTable("level_samples", {
  id: id("ls"),
  submissionId: text("submission_id")
    .notNull()
    .references(() => writingSubmissions.id, { onDelete: "cascade" }),
  targetLevel: smallint("target_level").notNull(),
  text: text("text").notNull(),
  changes: jsonb("changes").$type<{ original: string; sample: string; note: string }[]>().notNull(),
  createdAt: createdAt(),
});
