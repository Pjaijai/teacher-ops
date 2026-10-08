import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp } from "drizzle-orm/pg-core";
import type { QuestionContent } from "@/lib/schemas/question";
import { users } from "./auth";
import { createdAt, embedding, id } from "./columns";
import { examLanguageEnum, questionKindEnum, questionOriginEnum, questionStatusEnum, subjectEnum } from "./enums";

/**
 * The shared question bank. Public + servable + searchable when status = 'active' and ownerId is null.
 * Questions from a reference image or a student's own prompt are private (ownerId set).
 */
export const questions = pgTable(
  "questions",
  {
    id: id("q"),
    subject: subjectEnum("subject").notNull(),
    kind: questionKindEnum("kind").notNull(),
    origin: questionOriginEnum("origin").notNull().default("bank"),
    status: questionStatusEnum("status").notNull().default("checking"),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
    language: examLanguageEnum("language").notNull(),
    topicIds: text("topic_ids").array().notNull().default([]),
    archetypeId: text("archetype_id"),
    part: text("part"),
    difficulty: smallint("difficulty").notNull().default(3),
    extension: boolean("extension").notNull().default(false),
    title: text("title").notNull(),
    /** Everything shown or used for marking: stem, materials, figure, options, answers, scheme, 解題, tips. */
    content: jsonb("content").$type<QuestionContent>().notNull(),
    checkProblems: text("check_problems").array().notNull().default([]),
    searchText: text("search_text").notNull().default(""),
    embedding: embedding(),
    ratingUp: integer("rating_up").notNull().default(0),
    ratingDown: integer("rating_down").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    generatedBy: text("generated_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("questions_subject_status").on(t.subject, t.status),
    index("questions_topics").using("gin", t.topicIds),
    index("questions_search_trgm").using("gin", sql`${t.searchText} gin_trgm_ops`),
    index("questions_embedding").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const questionViews = pgTable(
  "question_views",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    attempted: boolean("attempted").notNull().default(false),
    solutionRevealedEarly: boolean("solution_revealed_early").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })],
);

export const questionRatings = pgTable(
  "question_ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    value: smallint("value").notNull().default(0), // -1 | 0 | 1
    reportReason: text("report_reason"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })],
);
