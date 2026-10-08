# API design (Hono on Cloudflare Workers)

Status: **designed, not implemented.** This replaces the teacher-only route list from 2026-10-06.

## Shape
- One Hono app is mounted in Next.js at `src/app/api/[[...route]]/route.ts`. It exports `GET`, `POST`, `PATCH` and `DELETE` = `handle(app)`. Better Auth is mounted at `/api/auth/*` inside the same Hono app.
- **Routers** are in `src/server/api/routes/<area>.ts`, and each exports a `Hono` sub-app. `src/server/api/app.ts` chains them and exports **`type AppType`**.
- **Typed client:** the frontend uses `hc<AppType>("/api")` (`src/lib/api-client.ts`). Each feature wraps calls in TanStack Query hooks (`features/<area>/api/use-*.ts`).
- **Validation:** every input uses `zValidator` with zod schemas from `src/lib/schemas/`, shared with the frontend.
- **Middleware**, in `src/server/api/middleware/`, in this order:
  1. `with-db.ts` creates the Drizzle client from Hyperdrive for each request.
  2. `with-session.ts` sets the Better Auth session. It returns 401 if there's none, except on public routes.
  3. `with-rate-limit.ts` is a per-user burst limit (Workers Rate Limiting binding).
- **Credits:** routes that start AI work call `chargeCredits(user, action)` **before** starting. An insufficient balance returns `402 {error:"credits", balance, cost}`. A failed job refunds.
- **Long work** (transcribe, feedback, estimate, level sample, mark answer, generate new question) returns `202 { jobId }`. The client follows `GET /api/jobs/:id/stream` (Server-Sent Events) until the job ends, then refetches the resource.
- **Errors:** responses are `{ error: code, message }` with an HTTP status. Codes include `unauthorized`, `forbidden`, `not_found`, `credits`, `validation`, `rate_limited` and `ai_failed`.
- **Access:** every handler passes `c.var.user.id` to services. Services never accept a user ID from the request body.

## Routes

### Session and profile — `routes/me.ts`
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/me` | | `{ user, profile, credits: {balance, quota, resetsAt} }` |
| PATCH | `/me/profile` | `{ displayName?, nickname?, form?, subjects?, examLanguage?, uiLocale?, extensionTrack? }` | `Profile` (nickname must be unique) |
| GET | `/me/credits/history` | `?cursor` | ledger page |
| DELETE | `/me` | `{ confirm: "DELETE" }` | 204: deletes the account, data and R2 prefix |

### Reference — `routes/reference.ts` (cacheable)
| GET | `/topics?subject=` | topic tree (units, subtopics, genres, text types, parts) |
|---|---|---|
| GET | `/rubrics/:subject` | criteria and level descriptors (public text only) |

### Question bank and search — `routes/questions.ts`
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/questions/search` | `?subject&topic[]&kind&part&difficulty&extension&locale&q&unattempted&sort=relevance\|rating\|new&cursor` | `{ items: QuestionPreview[], nextCursor }`. Free. Public bank only. |
| GET | `/questions/:id` | | `Question` for the student view: **no answers or scheme until submitted** (MC options are shown) |
| GET | `/questions/:id/solution` | | answers, marking scheme, 解題 thinking, tips. Allowed after an attempt or submission, or with `?reveal=1` (logged; reveals before an attempt can't be made public later) |
| POST | `/questions/next` | `{ subject, topicIds?, kind, part?, difficulty?, extension? }` | serves an unseen active bank question, 0 credits; or `202 {jobId}` to generate one (2 credits) |
| POST | `/questions/from-reference` | `{ uploadKeys: string[], subject }` | `202 {jobId}` → understanding (2 credits) |
| POST | `/questions/from-reference/:jobId/generate` | `{ understanding (edited), level, kind, count, language }` | `202 {jobId}`; questions are private (`ownerId` = user) |
| POST | `/questions/own-prompt` | `{ subject, part, text, materials? }` | private writing-task question |
| POST | `/questions/:id/rating` | `{ value: 1\|-1 }` or `{ report: reason }` | updated counts |

### Writing — `routes/writing.ts`
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/writing/:questionId/helpers/:kind` | | `kind` ∈ task_analysis, outline, vocabulary, sentence_patterns, idioms. Cached per user and question; free when cached (1–2 credits otherwise). Scaffolding only. |
| POST | `/writing/submissions` | `{ questionId, inputMode, text?, uploadKeys?, wantsEstimate, parentSubmissionId? }` | `Submission`; photo mode → `202 {jobId}` (transcribe, 3 credits per page) |
| GET | `/writing/submissions/:id` | | submission + pages (signed GET URLs) + feedback + scores + samples |
| PATCH | `/writing/submissions/:id/text` | `{ editedText }` | the server diffs against `aiText` and stores `edits[]` |
| POST | `/writing/submissions/:id/submit` | `{ wantsEstimate }` | `202 {jobId}`: feedback (8 credits) plus the estimate (+5) |
| POST | `/writing/submissions/:id/sample` | `{ targetLevel? }` (default = estimate + 1, or 4) | `202 {jobId}` (10 credits) |
| GET | `/writing/submissions` | `?questionId&cursor` | the student's history |

### Practice (maths, M1/M2, Physics) — `routes/practice.ts`
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/practice/attempts` | `{ questionId }` | `Attempt` (status answering) |
| POST | `/practice/attempts/:id/mc` | `{ choice }` | instant `{ correct, correctOption, misconception, solution }`, 0 credits |
| POST | `/practice/attempts/:id/pages` | `{ uploadKeys }` | `202 {jobId}` → LaTeX transcript (3 credits per page) |
| PATCH | `/practice/attempts/:id/transcript` | `{ lines: [{latex}] }` | stores the edits |
| POST | `/practice/attempts/:id/mark` | | `202 {jobId}` (5 credits per question) |
| GET | `/practice/attempts/:id` | | attempt + marks (with reasons) + parts (first wrong line, 解題 note) |
| POST | `/practice/attempts/:id/disputes` | `{ part, markIndex?, reason }` | `Dispute` |

### Shared answers — `routes/community.ts`
| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/community/answers` | `{ sourceType, sourceId, includeScore, includeFeedback }` | publishes a snapshot (personal-info check; nickname required) |
| PATCH | `/community/answers/:id` | `{ visibility: "private" }` or `{ republish: true, includeScore?, includeFeedback? }` | hide, or refresh the snapshot |
| GET | `/questions/:id/answers` | `?sort=top\|new&cursor` | **403 until the viewer has their own attempt or submission** on the question; nicknames only |
| PUT | `/community/answers/:id/vote` | `{ value: 1\|-1\|0 }` | 0 removes the vote; own answers are rejected |
| POST | `/community/answers/:id/report` | `{ reason, note? }` | the third report hides the answer |

### Uploads — `routes/uploads.ts`
| POST | `/uploads` | `{ files: [{contentType, size}] }` (images ≤ 10 MB, max 8) | `[{ key: "u/<userId>/<uuid>.jpg", putUrl }]`: presigned R2 PUT URLs, 10-minute expiry |
|---|---|---|---|

### Jobs — `routes/jobs.ts`
| GET | `/jobs/:id` | job row (owner only) |
|---|---|---|
| GET | `/jobs/:id/stream` | SSE: `progress` events `{step, status}`, then `done {resourceRef}` or `error` |

### Dashboard — `routes/dashboard.ts`
| GET | `/dashboard?subject=` | `{ criterionStats, errorTags, topicMastery, nextSteps, recent }` |
|---|---|---|
| PATCH | `/dashboard/next-steps/:id` | `{ status }` |

## Workflows (`src/server/jobs/`)
Each long job is a Cloudflare Workflow whose steps can be retried. Each step writes `jobs.progress`.

| Workflow | Steps |
|---|---|
| `transcribe-workflow` | load pages from R2 → transcribe (top model) → store `aiText` / transcript → status `review` |
| `writing-feedback-workflow` | 繁簡 check (code) → feedback (top model) → [estimate: retrieve anchors → score → caps (code)] → locate spans → update profile |
| `level-sample-workflow` | load essay + feedback → rewrite at the target level → align changes |
| `mark-answer-workflow` | load scheme → mark (top model) → code-check numbers → store marks → update mastery |
| `generate-question-workflow` | pick archetype → generate (light model) → code checks → one repair round → embed → insert into the bank (`active` only if checks pass) |

Workflows are bound in `wrangler.jsonc`, and their classes are exported from the OpenNext worker entry (`worker.ts`).

## Service mapping
Routes stay thin: they validate, call a service, and return. The services live in `src/server/services/**` and are the only code that touches Drizzle or the AI client. See [frontend.md](frontend.md) for the full file tree.
