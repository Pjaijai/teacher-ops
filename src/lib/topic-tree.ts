import cpUnits from "../../syllabus/math-compulsory.json";
import m1Units from "../../syllabus/m1.json";
import m2Units from "../../syllabus/m2.json";
import physicsTopics from "../../syllabus/physics.json";
import type { Subject } from "./subjects";
import { CHI_WRITING_TOPICS, ENG_WRITING_TOPICS } from "./writing-topics";

/** One row of the topic tree (same shape as GET /api/reference/topics), bundled for local mode. */
export type TopicRow = {
  id: string;
  subject: Subject;
  parentId: string | null;
  kind: string;
  nameEn: string;
  nameZh: string;
  extension: boolean;
  foundation: string | null;
  strand?: string;
};

type Unit = { id: string; subject: Subject; strand: string; nameEn: string; nameZh: string; foundation: string | null; extension: boolean };

const units = (list: Unit[]): TopicRow[] =>
  list.map((u) => ({ id: u.id, subject: u.subject, parentId: null, kind: "unit", nameEn: u.nameEn, nameZh: u.nameZh, extension: u.extension, foundation: u.foundation, strand: u.strand }));

const writing = (subject: Subject, list: typeof CHI_WRITING_TOPICS): TopicRow[] =>
  list.map((t) => ({ ...t, subject, extension: false, foundation: null }));

const ALL: TopicRow[] = [
  ...writing("chi_writing", CHI_WRITING_TOPICS),
  ...writing("eng_writing", ENG_WRITING_TOPICS),
  ...units(cpUnits as Unit[]),
  ...units(m1Units as Unit[]),
  ...units(m2Units as Unit[]),
  ...units(physicsTopics as Unit[]),
];

export function topicsFor(subject?: Subject): TopicRow[] {
  return subject ? ALL.filter((t) => t.subject === subject) : ALL;
}

export function topicName(id: string, locale: string) {
  const t = ALL.find((x) => x.id === id);
  return t ? (locale === "en" ? t.nameEn : t.nameZh) : id;
}
