# Database design (Drizzle + Postgres/pgvector)

Status: **designed, not implemented.** This replaces the teacher-only design from 2026-10-06.

- **Engine:** Postgres + `pgvector` on Railway (Singapore). Workers reach it through Cloudflare Hyperdrive.
- **ORM:** Drizzle with `postgres.js`. Migrations run with `drizzle-kit` from CI or a developer machine, never from the Worker.

## Conventions
- **Schema files** are in `src/server/db/schema/`, one per area, with kebab-case names. Table names are snake_case plurals; TypeScript names are camelCase.
- **IDs** are `text` primary keys with a prefix plus a cuid2 (`usr_…`, `q_…`, `sub_…`), so they're readable in logs and URLs.
- **Timestamps:** every table has `createdAt`. Mutable tables also have `updatedAt`. All are `timestamptz`.
- **Ownership:** every row of student data has `userId`. **Every service query filters by the session's `userId`.** The helpers in `server/db/scoped.ts` take the user as their first argument, so an unscoped query doesn't type-check.
- **AI vs user values:** where the AI produces something the student can change, both are stored, e.g. `aiText` and `editedText`. The effective value is the edited one if present.
- **Enums** are Postgres enums defined in `schema/enums.ts`.
- **Vectors:** `vector(4096)` for `qwen/qwen3-embedding-8b`. The dimension is a constant in `schema/corpus.ts`, so changing models means a migration plus a re-embed.

## Enums (`schema/enums.ts`)
```ts
subject:          chi_writing | eng_writing | math_cp | math_m1 | math_m2 | physics
locale:           zh-HK | en
examLanguage:     zh | en
questionKind:     writing_task | mc | short | long | experiment
questionOrigin:   bank | reference_image | own_prompt
questionStatus:   checking | active | reported | retired
jobKind:          transcribe | feedback | dse_estimate | level_sample | mark_answer | generate_question | reference_understand
jobStatus:        queued | running | succeeded | failed
feedbackKind:     task_recap | strength | wrong_char | mixed_script | problem_sentence | good_sentence
                | eng_error | vocab_upgrade | structure_upgrade | overall
helperKind:       task_analysis | outline | vocabulary | sentence_patterns | idioms
```

## Tables

### Auth (Better Auth, `schema/auth.ts`)
- **`users`:** `id`, `email` (unique), `emailVerified`, `name`, `image`, `createdAt`, `updatedAt`.
- **`sessions`, `accounts` (Google), `verifications` (email codes).** These are the standard Better Auth tables, generated with its Drizzle adapter.

### Profile and credits (`schema/profile.ts`)
```
profiles
  userId        pk → users.id (cascade)
  displayName   text
  form          int  (4|5|6)
  subjects      subject[]          -- drives navigation and the dashboard
  examLanguage  examLanguage        -- maths/M1/M2/physics content language
  uiLocale      locale
  extensionTrack boolean default true   -- show * extension questions

credit_ledger                        -- append-only; balance = quota − today's spend
  id, userId → users, delta int (negative = spend), reason text,
  jobId → jobs (nullable), questionId (nullable), createdAt
  index (userId, createdAt)

ai_runs                              -- one row per model call, for cost tracking
  id, userId, jobId (nullable), purpose text, model text,
  inputTokens int, outputTokens int, costUsd numeric(10,6), latencyMs int, createdAt
```
Today's balance is `DAILY_QUOTA + sum(delta)` over ledger rows since 00:00 HKT. The charge is taken **before** a job starts and refunded with a positive row if the job fails. This lives in `services/credits/charge-credits.ts`.

### Reference data (`schema/reference.ts`) — loaded from `syllabus/*.json` and `rubrics/*` by a seed script
```
topics                      -- one tree for all subjects
  id text pk                -- "CP-NF7", "M2-10", "PHY-II-6", "CHI-B-議論", "ENG-B-letter_to_editor"
  subject, parentId → topics (nullable), kind text ('unit'|'subtopic'|'genre'|'text_type'|'part')
  nameEn, nameZh, extension boolean, foundation boolean (CP only), sortOrder int
  objectives jsonb

archetypes
  id text pk, topicId → topics, kind questionKind,
  description text, scaffolding text, distractorPatterns jsonb, citations text[]   -- citations stay internal

rubric_criteria
  subject, part text, id text, nameEn, nameZh, scale jsonb, weight numeric
  pk (subject, part, id)
```
Writing genres and text types live in `topics`, so **question-bank search uses one topic filter for every subject**.

### Question bank (`schema/questions.ts`)
```
questions
  id, subject, kind questionKind, origin questionOrigin, status questionStatus
  ownerId → users (nullable; set for reference_image/own_prompt → private)
  locale examLanguage | null (writing: by subject)
  topicIds text[]  (gin index), archetypeId → archetypes (nullable)
  part text (乙部/甲部/A/B/P1A/P1B/P2…), difficulty smallint (1–5), extension boolean
  title text, stem text (Markdown + LaTeX), materials jsonb (writing: 甲部/Part A inputs)
  figure jsonb (DiagramSpec), options jsonb (MC), correctOption text
  distractorNotes jsonb ([{label, misconception, tag}])
  answers jsonb ([{part, expression|check, value, unit, display, acceptRange}])
  markingScheme jsonb ([{part, marks:[{type:'M'|'A', text, ecf?:string, keywords?:string[]}]}])
  taskAnalysis jsonb (解題: how to think), tips jsonb
  checkStatus text ('passed'|'needs_review'), checkProblems text[]
  searchText text (stem + title, stripped)       -- trigram index (pg_trgm)
  embedding vector(4096)                          -- hnsw cosine index; semantic search
  ratingSum int, ratingCount int, reportCount int
  generatedBy text (model), createdAt
  index (subject, status), gin(topicIds), gin(searchText gin_trgm_ops), hnsw(embedding)

question_views        -- "already seen/attempted" filter and bank serving
  userId, questionId, firstSeenAt, attempted boolean     pk (userId, questionId)

question_ratings
  userId, questionId, value smallint (−1|1), reportReason text (nullable), createdAt
  pk (userId, questionId)
```
- **Bank rules:** `status = 'active'` and `ownerId is null` make a question public, searchable and servable.
- **Reports:** at 3 or more, the question becomes `reported` automatically and leaves the bank until reviewed.

### Writing (`schema/writing.ts`)
```
writing_helpers          -- cached Ask-AI outputs per student per question
  id, userId, questionId, kind helperKind, content jsonb, createdAt
  unique (userId, questionId, kind)       -- re-asking returns the cached copy (free)

writing_submissions
  id, userId, questionId, status ('draft'|'transcribing'|'review'|'submitted'|'graded')
  inputMode ('typed'|'photo'), wantsEstimate boolean
  aiText text (with [X?]/[X!] markers + insertion marks), editedText text
  edits jsonb ([{from, to, aiSpan, editedSpan, at}])  -- tracked changes vs AI reading
  dominantScript ('trad'|'simp'|null), wordCount int
  parentSubmissionId → writing_submissions (revisions)
  createdAt, submittedAt

submission_pages
  submissionId, pageNo, r2Key, width, height     pk (submissionId, pageNo)

writing_feedback
  id, submissionId, kind feedbackKind, startPos int, endPos int,
  payload jsonb, tags text[], criterion text

writing_scores           -- only when wantsEstimate
  submissionId, part, criterion, grade text, marks numeric, maxMarks numeric,
  reason text, anchorChunkIds text[]           pk (submissionId, part, criterion)
  + writing_estimates: submissionId pk, totalMarks, level smallint, levelReason text

level_samples
  id, submissionId, targetLevel smallint, text text,
  changes jsonb ([{originalSpan, sampleSpan, note}]), createdAt
```

### Practice: answers and marking (`schema/practice.ts`)
```
attempts
  id, userId, questionId, status ('answering'|'transcribing'|'review'|'marking'|'marked')
  mcChoice text (nullable), mcCorrect boolean (nullable)
  aiTranscript jsonb ([{line, latex}]), editedTranscript jsonb, edits jsonb
  score numeric, maxScore numeric, createdAt, markedAt

attempt_pages
  attemptId, pageNo, r2Key       pk (attemptId, pageNo)

attempt_marks             -- one row per mark in the scheme
  attemptId, part text, markIndex int, type ('M'|'A'), awarded boolean,
  reason text, studentLine int (nullable), ecfFrom text (nullable)
  pk (attemptId, part, markIndex)
  + attempt_parts: attemptId, part, firstWrongLine int, note text (解題 for that part)

mark_disputes
  id, attemptId, part, markIndex (nullable = whole part), studentReason text,
  status ('open'|'upheld'|'rejected'), resolution text, createdAt
```

### Shared answers (`schema/community.ts`)
```
-- added columns
profiles.nickname            text unique (nullable; required before the first publish)
writing_submissions.visibility  ('private'|'public') default 'private'
attempts.visibility             ('private'|'public') default 'private'

public_answers               -- one row per published answer; a snapshot so later edits don't leak
  id, userId → users, questionId → questions,
  sourceType ('writing'|'attempt'), sourceId text (sub_…|att_…)  unique
  body text (final text / LaTeX transcript), includeScore boolean, includeFeedback boolean,
  scoreSummary jsonb (nullable), feedbackSummary jsonb (nullable),
  status ('published'|'hidden_by_owner'|'hidden_reported'|'removed'),
  upvotes int, downvotes int, score int generated (upvotes − downvotes), reportCount int,
  publishedAt, updatedAt
  index (questionId, status, score desc, publishedAt desc)

answer_votes
  userId, answerId → public_answers (cascade), value smallint (−1|1), createdAt, updatedAt
  pk (userId, answerId)                  -- one vote per student; changing it updates the row

answer_reports
  id, answerId, reporterId, reason ('wrong'|'inappropriate'|'personal_info'|'other'), note text,
  status ('open'|'actioned'|'dismissed'), createdAt
  unique (answerId, reporterId)
```
- **Snapshots:** publishing copies the final text into `public_answers.body`. Editing the source later doesn't change the public copy until the owner republishes.
- **Counters:** `upvotes`/`downvotes` are updated in the same transaction as the vote row.
- **Hiding:** a third open report sets `status = 'hidden_reported'`.
- **Gate:** community answers are readable only by users with a submission or attempt on the same question (an `exists` check in the service).
- **Account deletion:** cascades and removes the student's public answers and votes.

### Learner profile (`schema/learner.ts`) — derived, rebuildable from submissions and attempts
```
criterion_stats   userId, subject, part, criterion, ewma numeric, attempts int, lastAt   pk(userId,subject,part,criterion)
error_tag_stats   userId, subject, tag, weighted numeric, total int, lastAt                 pk(userId,subject,tag)
topic_mastery     userId, topicId → topics, ewma numeric, attempts int, lastAt             pk(userId,topicId)
next_steps        id, userId, subject, kind ('revise'|'helper'|'question'|'topic'), target jsonb,
                  rationale text, status ('open'|'done'|'dismissed'), createdAt
```
EWMA uses α = 0.35, so the last ~5 attempts dominate.

### Jobs (`schema/jobs.ts`)
```
jobs
  id, userId, kind jobKind, status jobStatus, subjectRef text ('sub_…'|'att_…'|'q_…'),
  progress jsonb ([{step, status, at}]), error text, creditsCharged int,
  workflowInstanceId text, createdAt, finishedAt
  index (userId, createdAt desc)
```
`GET /api/jobs/:id/stream` reads this table, and Workflow steps update `progress`.

### Corpus (`schema/corpus.ts`) — internal only, never exposed to students
```
corpus_documents
  id, subject, kind ('exemplar'|'past_question'|'reference_solution'), year, paper, part,
  questionNo, level smallint, genre text, topicIds text[], sourcePath text,
  split ('anchor'|'test'), text text

corpus_chunks
  id, documentId → corpus_documents (cascade), seq int (−1 = whole doc),
  text text, metadata jsonb, embedding vector(4096)
  hnsw(embedding vector_cosine_ops), gin(metadata)
```
Retrieval filters on `split = 'anchor'` and the metadata first, then orders by `embedding <=> $query`.

## Search queries (question bank)
- **Filters:** `subject`, `topicIds && $topics`, `kind`, `difficulty`, `extension`, `locale`. Always add `status = 'active' and ownerId is null`.
- **Keyword:**
  - Embed the query (cached for 1 hour in KV), then order by `embedding <=> $q`.
  - Union it with `searchText % $q` (trigram) to catch exact phrases.
  - Merge with reciprocal-rank fusion and page with a cursor.
- **"Already attempted":** a left join on `question_views` for the current user.

## Retention and privacy
- **Photos in R2:** kept 180 days, then deleted, keeping the text.
- **Account deletion:** cascades through every user table and deletes the user's R2 prefix `u/<userId>/`.
- **Analytics:** `ai_runs` keeps `userId` for cost analysis; anonymise it after 1 year.
