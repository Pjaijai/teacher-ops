import { index, integer, jsonb, pgTable, smallint, text } from "drizzle-orm/pg-core";
import { embedding } from "./columns";
import { subjectEnum } from "./enums";

/** HKEAA material, internal only: retrieval and calibration. Never returned to students. */
export const corpusDocuments = pgTable("corpus_documents", {
  id: text("id").primaryKey(),
  subject: subjectEnum("subject").notNull(),
  kind: text("kind").notNull(), // exemplar | past_question | reference_solution
  year: integer("year").notNull(),
  part: text("part"),
  questionNo: text("question_no"),
  level: smallint("level"),
  genre: text("genre"),
  topicIds: text("topic_ids").array().notNull().default([]),
  sourcePath: text("source_path").notNull(),
  split: text("split").notNull(), // anchor | test
  text: text("text").notNull(),
});

export const corpusChunks = pgTable(
  "corpus_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => corpusDocuments.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(), // -1 = whole document
    text: text("text").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    embedding: embedding().notNull(),
  },
  (t) => [index("corpus_chunks_embedding").using("hnsw", t.embedding.op("vector_cosine_ops"))],
);
