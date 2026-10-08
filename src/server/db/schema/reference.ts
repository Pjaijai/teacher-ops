import { boolean, integer, jsonb, numeric, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { questionKindEnum, subjectEnum } from "./enums";

/**
 * One topic tree for every subject: maths Learning Units (CP-7, M2-10), Physics (PHY-II-6),
 * writing parts, genres and text types (CHI-B, CHI-B-argumentative, ENG-B-letter_to_editor).
 * Question-bank search filters on these ids for all subjects.
 */
export const topics = pgTable("topics", {
  id: text("id").primaryKey(),
  subject: subjectEnum("subject").notNull(),
  parentId: text("parent_id"),
  kind: text("kind").notNull(), // unit | subtopic | part | genre | text_type
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  extension: boolean("extension").notNull().default(false),
  foundation: text("foundation"), // CP: FT | NFT | mixed
  sortOrder: integer("sort_order").notNull().default(0),
  objectives: jsonb("objectives").$type<{ id: string; textEn: string }[]>().notNull().default([]),
});

export const archetypes = pgTable("archetypes", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").references(() => topics.id),
  subject: subjectEnum("subject").notNull(),
  kind: questionKindEnum("kind").notNull(),
  description: text("description").notNull(),
  scaffolding: text("scaffolding"),
  distractorPatterns: jsonb("distractor_patterns").$type<string[]>(),
  citations: text("citations").array().notNull().default([]), // internal only
});

export const rubricCriteria = pgTable(
  "rubric_criteria",
  {
    subject: subjectEnum("subject").notNull(),
    part: text("part").notNull(),
    id: text("id").notNull(),
    nameEn: text("name_en").notNull(),
    nameZh: text("name_zh").notNull(),
    scale: jsonb("scale").$type<{ labels: string[]; max: number }>().notNull(),
    weight: numeric("weight").notNull(),
  },
  (t) => [primaryKey({ columns: [t.subject, t.part, t.id] })],
);
