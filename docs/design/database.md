# Database design

Status: **designed, not implemented.** Phase 1 stores these same shapes as JSON files (see [Phase 1 storage](#phase-1-storage-json-files)). The target engine for Phase 2 (students use the app, deployed) is **Postgres + pgvector**. All data access goes through one module (`src/lib/store/`), so moving from files to Postgres doesn't touch the features.

## Conventions
- IDs are text (`cuid`-style) so JSON files and SQL rows share them.
- `subject` is one of `chi_writing`, `eng_writing`, `math_cp`, `math_m1`, `math_m2`.
- Every AI-produced value that a teacher can change is stored twice: `ai_*` (what the model said) and `teacher_*` (the override, null if untouched). The effective value is `coalesce(teacher_*, ai_*)`. Keeping both gives us the teacher-marked test data for free.
- Times are `timestamptz`.

## Entity overview

```
classes ─< students ─< submissions ─< submission_pages
                │            │ ├─ transcriptions (1:1)
                │            │ ├─< writing_scores
                │            │ ├─< feedback_items
                │            │ └─< answer_results >─ questions
                │            └─ parent_submission_id (revision chain)
                ├─< criterion_stats    (derived)
                ├─< error_tag_stats    (derived)
                ├─< unit_mastery       (derived)
                └─< recommendations

tasks ─< submissions        worksheets ─< worksheet_questions >─ questions
syllabus_units ─< archetypes ─< questions
rubric_criteria
corpus_documents ─< corpus_chunks (embedding)
ai_runs
```

## Tables

### People

```sql
create table classes (
  id           text primary key,
  name         text not null,              -- "5A"
  school_year  text not null,              -- "2026-27"
  unique (name, school_year)
);

create table students (
  id            text primary key,
  class_id      text not null references classes(id),
  class_no      int  not null,
  display_name  text not null,
  writing_script text check (writing_script in ('trad','simp')),  -- last detected dominant script
  created_at    timestamptz not null default now(),
  unique (class_id, class_no)
);
```

Phase 2 adds `users` (teacher/student accounts) and `students.user_id`. That's out of scope here.

### Reference data (built from the distilled `rubrics/*.md` and `syllabus/*.json`)

```sql
create table syllabus_units (
  id           text primary key,            -- "CP-NF7", "M1-3", "M2-10"
  subject      text not null,
  strand       text,                        -- "Number and Algebra", "Calculus", ...
  name_en      text not null,
  name_zh      text not null,
  foundation   boolean,                     -- Compulsory Part only
  objectives   jsonb not null,              -- [{id, text_en, text_zh}]
  prerequisites text[] not null default '{}'
);

create table archetypes (                   -- from syllabus/<subject>-question-design.md
  id           text primary key,            -- "CP-NF7-sim-eq-ratio"
  unit_id      text not null references syllabus_units(id),
  answer_type  text not null check (answer_type in ('mc','long')),
  description  text not null,
  scaffolding  text,                        -- how (a)/(b)/(c) build up
  typical_marks int,
  distractor_patterns jsonb,                -- MC: [{mistake, how_it_produces_option}]
  citations    text[] not null              -- ["CP 2023 P2 Q9", ...]
);

create table rubric_criteria (
  subject      text not null,
  part         text not null,               -- chi: "B" (乙部), later "A"; eng: "A","B"
  id           text not null,               -- "content", "expression", ...
  name_en      text not null,
  name_zh      text,
  scale        jsonb not null,              -- ordered grade labels / max mark
  weight       numeric not null,
  primary key (subject, part, id)
);
```

### Tasks and submissions (the loop)

```sql
create table tasks (                        -- what a student is asked to do
  id           text primary key,
  subject      text not null,
  kind         text not null check (kind in ('essay','revision','drill','worksheet')),
  part         text,                        -- paper part for writing
  title        text not null,
  prompt       text,                        -- essay question / drill instructions
  source_doc_id text references corpus_documents(id),  -- past question used, if any
  worksheet_id text references worksheets(id),
  target       jsonb,                       -- {criterion} | {error_tags[]} | {unit_ids[]}
  created_at   timestamptz not null default now()
);

create table submissions (
  id           text primary key,
  student_id   text not null references students(id),
  task_id      text references tasks(id),
  subject      text not null,
  parent_submission_id text references submissions(id),  -- revise-and-resubmit chain
  round        int  not null default 1,
  status       text not null check (status in
                 ('uploaded','transcribed','verified','graded','finalized')),
  submitted_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table submission_pages (
  submission_id text not null references submissions(id) on delete cascade,
  page_no      int  not null,
  image_path   text not null,               -- object storage key in Phase 2
  primary key (submission_id, page_no)
);

create table transcriptions (
  submission_id text primary key references submissions(id) on delete cascade,
  ai_text      text not null,               -- with [X?] / [X!] markers
  teacher_text text,                        -- after the teacher check
  dominant_script text check (dominant_script in ('trad','simp')),  -- Chinese only
  title        text
);
```

### Writing results

```sql
create table writing_scores (
  submission_id text not null references submissions(id) on delete cascade,
  part         text not null,
  criterion    text not null,               -- rubric_criteria.id, or 'overall_level'
  ai_grade     text not null,               -- label on the criterion's scale, e.g. "上中", "5"
  teacher_grade text,
  reason       text not null,
  evidence_chunk_ids text[] not null default '{}',  -- retrieved anchors that justified it
  primary key (submission_id, part, criterion)
);

create table feedback_items (
  id           text primary key,
  submission_id text not null references submissions(id) on delete cascade,
  kind         text not null check (kind in (
                 'wrong_char','mixed_script','good_sentence','problem_sentence',
                 'eng_error','model_passage','overall_comment')),
  start_pos    int,                         -- offset in the effective transcription; null if unlocated
  end_pos      int,
  payload      jsonb not null,              -- kind-specific: {wrong, correct, explanation} etc.
  tags         text[] not null default '{}',-- normalized error tags, e.g. "zh.char.己/已", "en.sva"
  criterion    text,                        -- which rubric criterion it bears on
  status       text not null default 'ai' check (status in ('ai','edited','removed','teacher_added'))
);
create index on feedback_items using gin (tags);
```

### Maths

```sql
create table questions (                    -- both real DSE questions and generated ones
  id           text primary key,
  origin       text not null check (origin in ('corpus','generated')),
  source_doc_id text references corpus_documents(id),  -- corpus origin
  subject      text not null,
  unit_ids     text[] not null,
  archetype_id text references archetypes(id),
  answer_type  text not null check (answer_type in ('mc','long')),
  language     text not null check (language in ('en','zh')),
  stem         text not null,
  marks        int,
  diagram      jsonb,                       -- DiagramSchema
  options      jsonb,                       -- [{label, text}]
  correct_option text,
  distractor_notes jsonb,                   -- [{label, mistake, misconception_tag}]
  variables    jsonb,
  answers      jsonb not null,              -- [{part, expression|check, value, display}]
  solution     jsonb not null,              -- string[]
  check_status text not null check (check_status in ('passed','failed','needs_teacher')),
  check_problems text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create table worksheets (
  id           text primary key,
  subject      text not null,
  title        text not null,
  language     text not null,
  created_at   timestamptz not null default now()
);

create table worksheet_questions (
  worksheet_id text not null references worksheets(id) on delete cascade,
  position     int  not null,
  question_id  text not null references questions(id),
  primary key (worksheet_id, position)
);

create table answer_results (
  submission_id text not null references submissions(id) on delete cascade,
  question_id  text not null references questions(id),
  part         text not null default '',
  given        text,                        -- letter or numeric answer as entered/read
  ai_correct   boolean not null,
  teacher_correct boolean,
  chosen_option text,
  misconception_tag text,                   -- from the chosen distractor's note
  primary key (submission_id, question_id, part)
);
```

### Student profile (derived, recomputable)

These are materialised from finalised submissions. They can always be rebuilt from `writing_scores`, `feedback_items` and `answer_results`, so they're a cache, not the source of truth. Scores use an exponentially weighted moving average (EWMA) with α ≈ 0.35, so the last ~5 attempts dominate.

```sql
create table criterion_stats (
  student_id text not null references students(id),
  subject    text not null,
  part       text not null,
  criterion  text not null,
  ewma_score numeric not null,              -- grade mapped to 0..1
  attempts   int not null,
  last_at    timestamptz not null,
  primary key (student_id, subject, part, criterion)
);

create table error_tag_stats (
  student_id text not null references students(id),
  subject    text not null,
  tag        text not null,
  weighted_count numeric not null,          -- decays per submission
  total_count int not null,
  last_at    timestamptz not null,
  primary key (student_id, subject, tag)
);

create table unit_mastery (
  student_id text not null references students(id),
  unit_id    text not null references syllabus_units(id),
  ewma_correct numeric not null,
  attempts   int not null,
  last_at    timestamptz not null,
  primary key (student_id, unit_id)
);

create table recommendations (
  id         text primary key,
  student_id text not null references students(id),
  subject    text not null,
  kind       text not null check (kind in ('revise','drill','new_essay','worksheet')),
  target     jsonb not null,                -- {criterion} | {tags} | {unit_ids}
  rationale  text not null,
  model_chunk_ids text[] not null default '{}',
  status     text not null default 'open' check (status in ('open','assigned','done','dismissed')),
  task_id    text references tasks(id),
  created_at timestamptz not null default now()
);
```

### Corpus and retrieval (RAG)

```sql
create extension if not exists vector;

create table corpus_documents (
  id          text primary key,             -- "chi-2025-L5-1", "cp-2023-p2-q09"
  subject     text not null,
  kind        text not null check (kind in ('exemplar','past_question','reference_solution')),
  year        int  not null,
  paper       text,                         -- "P1","P2"
  part        text,
  question_no text,
  level       text,                         -- exemplar level "5","4",...; null otherwise
  genre       text,                         -- 議論/記敘/抒情, argumentative, ...
  source_path text not null,                -- file in paper/ + page range
  pages       int4range,
  split       text not null default 'anchor' check (split in ('anchor','test')),  -- held-out test set
  text        text not null
);

create table corpus_chunks (
  id          text primary key,
  document_id text not null references corpus_documents(id) on delete cascade,
  seq         int  not null,                -- paragraph / question part order
  text        text not null,
  metadata    jsonb not null,               -- {level, genre, criterion_strengths[], unit_ids[], archetype_id}
  embedding   vector not null               -- dimension fixed by corpus manifest's model
);
create index on corpus_chunks using hnsw (embedding vector_cosine_ops);
create index on corpus_chunks using gin (metadata);
```

Retrieval always filters on metadata first (subject, `split = 'anchor'`, level range, genre, unit), then ranks by cosine similarity. Chunks from the `test` split are never retrieved, so the accuracy tests stay honest.

### Audit

```sql
create table ai_runs (
  id          text primary key,
  purpose     text not null,                -- "transcribe","grade","retrieve","generate",...
  model       text not null,
  submission_id text references submissions(id),
  input_tokens int, output_tokens int, cost_usd numeric,
  created_at  timestamptz not null default now()
);
```

## Phase 1 storage (JSON files)

The same shapes are grouped by owner so that one file is one unit of work:

| Path | Contents (table equivalents) |
|---|---|
| `data/classes.json` | `classes`, `students` |
| `data/students/<class>/<student-id>.json` | that student's `submissions` (with `transcription`, `writing_scores`, `feedback_items`, `answer_results` nested), `criterion_stats`, `error_tag_stats`, `unit_mastery`, `recommendations` |
| `data/uploads/<submission-id>/page<N>.jpg` | `submission_pages` |
| `data/tasks.json`, `data/worksheets.json` | `tasks`, `worksheets` + `worksheet_questions` |
| `data/questions/<subject>.json` | generated `questions` |
| `corpus/<subject>.json` | `corpus_documents` + `corpus_chunks` (embeddings inline) + manifest `{embeddingModel, dims, builtAt}` |
| `syllabus/*.json`, `rubrics/*.json` | `syllabus_units`, `archetypes`, `rubric_criteria` |

`data/`, `corpus/` and `paper/` are git-ignored. Writes go to a temp file and are then renamed, so a crash can't leave a half-written student file.
