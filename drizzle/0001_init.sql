CREATE TYPE "public"."exam_language" AS ENUM('zh', 'en');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind" AS ENUM('task_recap', 'strength', 'wrong_char', 'mixed_script', 'problem_sentence', 'good_sentence', 'eng_error', 'vocab_upgrade', 'structure_upgrade', 'overall');--> statement-breakpoint
CREATE TYPE "public"."helper_kind" AS ENUM('task_analysis', 'outline', 'vocabulary', 'sentence_patterns', 'idioms');--> statement-breakpoint
CREATE TYPE "public"."job_kind" AS ENUM('transcribe_writing', 'writing_feedback', 'level_sample', 'transcribe_answer', 'mark_answer', 'generate_question', 'reference_understand', 'reference_generate');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('zh-HK', 'en');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('writing_task', 'mc', 'short', 'long', 'experiment');--> statement-breakpoint
CREATE TYPE "public"."question_origin" AS ENUM('bank', 'reference_image', 'own_prompt');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('checking', 'active', 'reported', 'retired');--> statement-breakpoint
CREATE TYPE "public"."subject" AS ENUM('chi_writing', 'eng_writing', 'math_cp', 'math_m1', 'math_m2', 'physics');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"job_id" text,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 6),
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"nickname" text,
	"form" smallint,
	"subjects" "subject"[] DEFAULT '{}' NOT NULL,
	"exam_language" "exam_language" DEFAULT 'en' NOT NULL,
	"ui_locale" "locale" DEFAULT 'zh-HK' NOT NULL,
	"extension_track" boolean DEFAULT true NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
CREATE TABLE "archetypes" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text,
	"subject" "subject" NOT NULL,
	"kind" "question_kind" NOT NULL,
	"description" text NOT NULL,
	"scaffolding" text,
	"distractor_patterns" jsonb,
	"citations" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_criteria" (
	"subject" "subject" NOT NULL,
	"part" text NOT NULL,
	"id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text NOT NULL,
	"scale" jsonb NOT NULL,
	"weight" numeric NOT NULL,
	CONSTRAINT "rubric_criteria_subject_part_id_pk" PRIMARY KEY("subject","part","id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" "subject" NOT NULL,
	"parent_id" text,
	"kind" text NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text NOT NULL,
	"extension" boolean DEFAULT false NOT NULL,
	"foundation" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_ratings" (
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"value" smallint DEFAULT 0 NOT NULL,
	"report_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_ratings_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "question_views" (
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempted" boolean DEFAULT false NOT NULL,
	"solution_revealed_early" boolean DEFAULT false NOT NULL,
	CONSTRAINT "question_views_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" "subject" NOT NULL,
	"kind" "question_kind" NOT NULL,
	"origin" "question_origin" DEFAULT 'bank' NOT NULL,
	"status" "question_status" DEFAULT 'checking' NOT NULL,
	"owner_id" text,
	"language" "exam_language" NOT NULL,
	"topic_ids" text[] DEFAULT '{}' NOT NULL,
	"archetype_id" text,
	"part" text,
	"difficulty" smallint DEFAULT 3 NOT NULL,
	"extension" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"check_problems" text[] DEFAULT '{}' NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"embedding" vector(1024),
	"rating_up" integer DEFAULT 0 NOT NULL,
	"rating_down" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"generated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_samples" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"target_level" smallint NOT NULL,
	"text" text NOT NULL,
	"changes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_pages" (
	"submission_id" text NOT NULL,
	"page_no" smallint NOT NULL,
	"storage_key" text NOT NULL,
	CONSTRAINT "submission_pages_submission_id_page_no_pk" PRIMARY KEY("submission_id","page_no")
);
--> statement-breakpoint
CREATE TABLE "writing_estimates" (
	"submission_id" text PRIMARY KEY NOT NULL,
	"total_marks" numeric NOT NULL,
	"max_marks" numeric NOT NULL,
	"level" smallint NOT NULL,
	"level_reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"start_pos" integer,
	"end_pos" integer,
	"payload" jsonb NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"criterion" text
);
--> statement-breakpoint
CREATE TABLE "writing_helpers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"kind" "helper_kind" NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writing_helpers_once" UNIQUE("user_id","question_id","kind")
);
--> statement-breakpoint
CREATE TABLE "writing_scores" (
	"submission_id" text NOT NULL,
	"part" text NOT NULL,
	"criterion" text NOT NULL,
	"grade" text NOT NULL,
	"marks" numeric NOT NULL,
	"max_marks" numeric NOT NULL,
	"reason" text NOT NULL,
	"anchor_ids" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "writing_scores_submission_id_part_criterion_pk" PRIMARY KEY("submission_id","part","criterion")
);
--> statement-breakpoint
CREATE TABLE "writing_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"input_mode" text NOT NULL,
	"wants_estimate" boolean DEFAULT false NOT NULL,
	"ai_text" text,
	"edited_text" text,
	"edits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dominant_script" text,
	"char_count" integer,
	"overall_comment" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"parent_submission_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attempt_marks" (
	"attempt_id" text NOT NULL,
	"part" text NOT NULL,
	"mark_index" smallint NOT NULL,
	"type" text NOT NULL,
	"awarded" boolean NOT NULL,
	"reason" text NOT NULL,
	"student_line" integer,
	"ecf_from" text,
	CONSTRAINT "attempt_marks_attempt_id_part_mark_index_pk" PRIMARY KEY("attempt_id","part","mark_index")
);
--> statement-breakpoint
CREATE TABLE "attempt_pages" (
	"attempt_id" text NOT NULL,
	"page_no" smallint NOT NULL,
	"storage_key" text NOT NULL,
	CONSTRAINT "attempt_pages_attempt_id_page_no_pk" PRIMARY KEY("attempt_id","page_no")
);
--> statement-breakpoint
CREATE TABLE "attempt_parts" (
	"attempt_id" text NOT NULL,
	"part" text NOT NULL,
	"first_wrong_line" integer,
	"note" text NOT NULL,
	CONSTRAINT "attempt_parts_attempt_id_part_pk" PRIMARY KEY("attempt_id","part")
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"status" text DEFAULT 'answering' NOT NULL,
	"mc_choice" text,
	"mc_correct" boolean,
	"ai_transcript" jsonb,
	"edited_transcript" jsonb,
	"edits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" numeric,
	"max_score" numeric,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"marked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mark_disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"part" text NOT NULL,
	"mark_index" smallint,
	"student_reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"answer_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_reports_once" UNIQUE("answer_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE "answer_votes" (
	"user_id" text NOT NULL,
	"answer_id" text NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_votes_user_id_answer_id_pk" PRIMARY KEY("user_id","answer_id")
);
--> statement-breakpoint
CREATE TABLE "public_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"body" text NOT NULL,
	"include_score" boolean DEFAULT false NOT NULL,
	"include_feedback" boolean DEFAULT false NOT NULL,
	"score_summary" jsonb,
	"feedback_summary" jsonb,
	"status" text DEFAULT 'published' NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_answers_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "criterion_stats" (
	"user_id" text NOT NULL,
	"subject" "subject" NOT NULL,
	"part" text NOT NULL,
	"criterion" text NOT NULL,
	"ewma" numeric NOT NULL,
	"attempts" integer NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	CONSTRAINT "criterion_stats_user_id_subject_part_criterion_pk" PRIMARY KEY("user_id","subject","part","criterion")
);
--> statement-breakpoint
CREATE TABLE "error_tag_stats" (
	"user_id" text NOT NULL,
	"subject" "subject" NOT NULL,
	"tag" text NOT NULL,
	"weighted" numeric NOT NULL,
	"total" integer NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	CONSTRAINT "error_tag_stats_user_id_subject_tag_pk" PRIMARY KEY("user_id","subject","tag")
);
--> statement-breakpoint
CREATE TABLE "next_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject" "subject" NOT NULL,
	"kind" text NOT NULL,
	"target" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_mastery" (
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"ewma" numeric NOT NULL,
	"attempts" integer NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	CONSTRAINT "topic_mastery_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "job_kind" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"resource_ref" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"progress" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "corpus_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"seq" integer NOT NULL,
	"text" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"embedding" vector(1024) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corpus_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" "subject" NOT NULL,
	"kind" text NOT NULL,
	"year" integer NOT NULL,
	"part" text,
	"question_no" text,
	"level" smallint,
	"genre" text,
	"topic_ids" text[] DEFAULT '{}' NOT NULL,
	"source_path" text NOT NULL,
	"split" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archetypes" ADD CONSTRAINT "archetypes_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_ratings" ADD CONSTRAINT "question_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_ratings" ADD CONSTRAINT "question_ratings_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_views" ADD CONSTRAINT "question_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_views" ADD CONSTRAINT "question_views_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_samples" ADD CONSTRAINT "level_samples_submission_id_writing_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."writing_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_pages" ADD CONSTRAINT "submission_pages_submission_id_writing_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."writing_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_estimates" ADD CONSTRAINT "writing_estimates_submission_id_writing_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."writing_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_feedback" ADD CONSTRAINT "writing_feedback_submission_id_writing_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."writing_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_helpers" ADD CONSTRAINT "writing_helpers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_helpers" ADD CONSTRAINT "writing_helpers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_scores" ADD CONSTRAINT "writing_scores_submission_id_writing_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."writing_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_marks" ADD CONSTRAINT "attempt_marks_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_pages" ADD CONSTRAINT "attempt_pages_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_parts" ADD CONSTRAINT "attempt_parts_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mark_disputes" ADD CONSTRAINT "mark_disputes_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_reports" ADD CONSTRAINT "answer_reports_answer_id_public_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."public_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_reports" ADD CONSTRAINT "answer_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_votes" ADD CONSTRAINT "answer_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_votes" ADD CONSTRAINT "answer_votes_answer_id_public_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."public_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_answers" ADD CONSTRAINT "public_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_answers" ADD CONSTRAINT "public_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion_stats" ADD CONSTRAINT "criterion_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_tag_stats" ADD CONSTRAINT "error_tag_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_steps" ADD CONSTRAINT "next_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_chunks" ADD CONSTRAINT "corpus_chunks_document_id_corpus_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."corpus_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_user_time" ON "ai_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_time" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "questions_subject_status" ON "questions" USING btree ("subject","status");--> statement-breakpoint
CREATE INDEX "questions_topics" ON "questions" USING gin ("topic_ids");--> statement-breakpoint
CREATE INDEX "questions_search_trgm" ON "questions" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "questions_embedding" ON "questions" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "writing_feedback_submission" ON "writing_feedback" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "writing_submissions_user" ON "writing_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "attempts_user" ON "attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "public_answers_question" ON "public_answers" USING btree ("question_id","status");--> statement-breakpoint
CREATE INDEX "jobs_user_time" ON "jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "corpus_chunks_embedding" ON "corpus_chunks" USING hnsw ("embedding" vector_cosine_ops);