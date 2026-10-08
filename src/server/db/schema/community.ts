import { boolean, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, id } from "./columns";
import { questions } from "./questions";

/** A published snapshot: later edits to the source don't leak until the owner republishes. */
export const publicAnswers = pgTable(
  "public_answers",
  {
    id: id("ans"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(), // writing | attempt
    sourceId: text("source_id").notNull().unique(),
    body: text("body").notNull(),
    includeScore: boolean("include_score").notNull().default(false),
    includeFeedback: boolean("include_feedback").notNull().default(false),
    scoreSummary: jsonb("score_summary"),
    feedbackSummary: jsonb("feedback_summary"),
    /** published | hidden_by_owner | hidden_reported | removed */
    status: text("status").notNull().default("published"),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("public_answers_question").on(t.questionId, t.status)],
);

export const answerVotes = pgTable(
  "answer_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answerId: text("answer_id")
      .notNull()
      .references(() => publicAnswers.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.answerId] })],
);

export const answerReports = pgTable(
  "answer_reports",
  {
    id: id("rep"),
    answerId: text("answer_id")
      .notNull()
      .references(() => publicAnswers.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [unique("answer_reports_once").on(t.answerId, t.reporterId)],
);
