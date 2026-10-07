# API design

Next.js route handlers under `src/app/api`. These follow the existing conventions:

- JSON in, JSON out. Errors come back through `jsonRoute` as `{ error }` with a non-2xx status.
- Request bodies are validated with zod. Shapes reference the tables in [database.md](database.md).
- AI steps run synchronously in Phase 1 (one teacher, local). Phase 2 moves grading and corpus work onto a job queue that returns `202 { jobId }`, polled through `GET /api/jobs/:id`.
- No auth in Phase 1. Phase 2 adds teacher/student roles, and every `/students/:id/*` route checks access.

Subjects: `chi_writing | eng_writing | math_cp | math_m1 | math_m2`.

## Existing routes (kept)

| Route | Change |
|---|---|
| `POST /api/questions/understand` | Adds `subject` (math_*) and returns suggested `unitIds` + `archetypeId`. |
| `POST /api/questions/generate` | Adds `subject`, `unitIds`, optional `archetypeId` (generate from a blueprint with no reference screenshot), and saves results to `questions`. |
| `POST /api/essay/transcribe` | Becomes an alias of `POST /api/submissions/:id/transcribe` for one-off use without a student. |
| `POST /api/essay/analyze` | Becomes an alias of grading in feedback-only mode. |

## Classes and students

| Method & path | Body / query | Returns |
|---|---|---|
| `GET /api/classes` | | `Class[]` with student counts |
| `POST /api/classes` | `{ name, schoolYear }` | `Class` |
| `GET /api/classes/:classId/students` | | `Student[]` |
| `POST /api/classes/:classId/students` | `{ classNo, displayName }` or `{ roster: [...] }` | `Student[]` |
| `PATCH /api/students/:id` | `{ displayName?, classNo? }` | `Student` |
| `GET /api/students/:id/profile?subject=` | | `{ criterionStats, errorTagStats, unitMastery, recommendations, history: SubmissionSummary[] }` |
| `GET /api/classes/:classId/summary?subject=` | | Class-level stats: common error tags (e.g. top 錯別字), criterion averages, weakest units |

## Submissions (writing and maths)

A submission is one piece of student work for one task. Writing goes through `uploaded → transcribed → verified → graded → finalized`. Maths worksheet results skip transcription.

| Method & path | Body | Returns |
|---|---|---|
| `POST /api/submissions` | `{ studentId, subject, taskId?, parentSubmissionId?, pages: ImageInput[] }` | `Submission` (status `uploaded`; round = parent's round + 1) |
| `GET /api/submissions/:id` | | Full submission: pages, transcription, scores, feedback, results |
| `POST /api/submissions/:id/transcribe` | | `Transcription` (`ai_text` with `[X?]`/`[X!]` markers, detected `dominantScript`) |
| `PUT /api/submissions/:id/transcription` | `{ text }` | Saves `teacher_text`; status → `verified` |
| `POST /api/submissions/:id/grade` | `{ part?, mode?: 'full' \| 'feedback_only' }` | `{ scores: WritingScore[], items: FeedbackItem[], evidence: Chunk[] }`; status → `graded` |
| `PATCH /api/submissions/:id/scores` | `{ part, criterion, teacherGrade }[]` | Updated scores |
| `POST /api/submissions/:id/feedback` | `{ kind, startPos, endPos, payload }` | New item (`teacher_added`) |
| `PATCH /api/submissions/:id/feedback/:itemId` | `{ payload?, status? }` | Updated item (`edited` / `removed`) |
| `POST /api/submissions/:id/finalize` | | Recomputes the student's derived stats and creates `recommendations`; status → `finalized` |
| `GET /api/submissions/:id/compare` | | Before/after with the parent submission: score change per criterion, resolved and remaining error tags |

### What `grade` does (writing)
1. Load the effective transcription. For Chinese, run the deterministic 繁簡 check against the dominant script → `mixed_script` items.
2. AI pass: 錯別字, 病句, 佳句 (Chinese) or error tagging (English).
3. **Retrieve calibration anchors**: chunks from `split = 'anchor'` exemplars of the same subject and part, at levels around a first-pass estimate, plus the same genre when available.
4. Score each rubric criterion against the rubric and the anchors, giving a grade, a reason and `evidence_chunk_ids`, then an overall level.
5. **Retrieve improvement models** for the 1–2 weakest criteria: higher-level passages on similar content, saved as `model_passage` items.
6. Map quotes back onto positions (`locateFeedback`), then save.

## Practice

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/students/:id/recommendations?subject=` | | `Recommendation[]` (open first) |
| `POST /api/recommendations/:id/assign` | `{ format?: 'print' }` | Creates the `Task` (revision prompt, drill sheet or worksheet), status → `assigned` |
| `POST /api/practice/drills` | `{ studentId?, subject, target: { criterion } \| { tags } , count? }` | Drill `Task` with items + a model passage for each drill |
| `POST /api/practice/prompts` | `{ subject, part, genre?, excludeUsedBy?: studentId }` | Past questions (from the corpus) for a new essay |
| `POST /api/worksheets` | `{ subject, title, language, questionIds }` or `{ subject, unitIds, count, answerType, language, studentId? }` (auto-select + generate for weak units) | `Worksheet` |
| `GET /api/worksheets/:id` | `?view=paper\|key` | Printable worksheet or answer key data |
| `POST /api/worksheets/:id/results` | `{ studentId, answers: { questionId, part, given }[] }` | Creates a submission with `answer_results` (auto-marked, misconception tags from the chosen distractor) |
| `POST /api/worksheets/:id/results/scan` | `{ studentId, pages: ImageInput[] }` | Same, with answers read from a photo of the answer grid (the teacher confirms before finalising) |

## Reference data and retrieval

| Method & path | Returns |
|---|---|
| `GET /api/syllabus/:subject` | `SyllabusUnit[]` with `archetypes` |
| `GET /api/rubrics/:subject` | `RubricCriterion[]` + level descriptors |
| `POST /api/retrieve` | `{ subject, purpose: 'calibration'\|'improvement'\|'practice', query, filters? }` → ranked `Chunk[]` with scores. Used internally and for debugging retrieval in the UI. |

Corpus building is **not** an API. It's an offline script (`npm run corpus:build -- <subject>`): render PDF pages → transcribe → split into chunks → tag → embed → write `corpus/<subject>.json`. Accuracy tests are scripts too (`npm run test:scoring`, `test:handwriting`, `test:checks`).

## Shared types (sketch)

```ts
type Subject = "chi_writing" | "eng_writing" | "math_cp" | "math_m1" | "math_m2";

type WritingScore = { part: string; criterion: string; aiGrade: string; teacherGrade: string | null; reason: string; evidenceChunkIds: string[] };

type FeedbackItem = {
  id: string;
  kind: "wrong_char" | "mixed_script" | "good_sentence" | "problem_sentence" | "eng_error" | "model_passage" | "overall_comment";
  startPos: number | null; endPos: number | null;
  payload: Record<string, unknown>;
  tags: string[]; criterion: string | null;
  status: "ai" | "edited" | "removed" | "teacher_added";
};

type Chunk = { id: string; documentId: string; text: string; score: number; metadata: { level?: string; genre?: string; unitIds?: string[]; year: number } };

type Recommendation = { id: string; kind: "revise" | "drill" | "new_essay" | "worksheet"; target: unknown; rationale: string; modelChunkIds: string[]; status: string };
```
