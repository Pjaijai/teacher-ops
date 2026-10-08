import { pgEnum } from "drizzle-orm/pg-core";
import { SUBJECTS } from "@/lib/subjects";

export const subjectEnum = pgEnum("subject", SUBJECTS);
export const localeEnum = pgEnum("locale", ["zh-HK", "en"]);
export const examLanguageEnum = pgEnum("exam_language", ["zh", "en"]);
export const questionKindEnum = pgEnum("question_kind", ["writing_task", "mc", "short", "long", "experiment"]);
export const questionOriginEnum = pgEnum("question_origin", ["bank", "reference_image", "own_prompt"]);
export const questionStatusEnum = pgEnum("question_status", ["checking", "active", "reported", "retired"]);
export const jobKindEnum = pgEnum("job_kind", [
  "transcribe_writing",
  "writing_feedback",
  "level_sample",
  "transcribe_answer",
  "mark_answer",
  "generate_question",
  "reference_understand",
  "reference_generate",
]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "succeeded", "failed"]);
export const visibilityEnum = pgEnum("visibility", ["private", "public"]);
export const helperKindEnum = pgEnum("helper_kind", ["task_analysis", "outline", "vocabulary", "sentence_patterns", "idioms"]);
export const feedbackKindEnum = pgEnum("feedback_kind", [
  "task_recap",
  "strength",
  "wrong_char",
  "mixed_script",
  "problem_sentence",
  "good_sentence",
  "eng_error",
  "vocab_upgrade",
  "structure_upgrade",
  "overall",
]);
