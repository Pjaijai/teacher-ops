# Migration from the demo

How the current code (a local teacher demo plus the corpus and scorer work) moves into the deployed student app. Each step should leave the app building.

## 1. Tooling
- Add Tailwind and shadcn/ui (`components.json`, with `src/components/ui/` aliases). Swap the hand-written CSS in `globals.css` for theme tokens, keeping the feedback colours (wrong, good, problem, unsure).
- Add TanStack Query, next-intl, Hono, Drizzle, Better Auth, KaTeX, Mafs, `@opennextjs/cloudflare` and Wrangler.
- Add the `src/proxy.ts` locale proxy. In Next 16, `middleware.ts` is deprecated and renamed `proxy.ts`.

## 2. Renames and moves (kebab-case)
| Now | Becomes |
|---|---|
| `src/components/DiagramView.tsx` | `src/components/diagrams/geometry-diagram.tsx` (+ `diagram-view.tsx` dispatcher) |
| `src/components/ImagePicker.tsx` | `src/components/common/image-uploader.tsx` (R2 upload) |
| `src/lib/ai.ts` | `src/server/ai/open-router.ts` (+ cost logging to `ai_runs`) |
| `src/lib/embed.ts` | `src/server/ai/embed.ts` |
| `src/lib/diagram.ts` | `src/lib/diagram/diagram-spec.ts` + `check-diagram.ts` |
| `src/lib/check.ts` | `src/server/services/practice/check-answer.ts` |
| `src/lib/questions.ts` | `src/lib/schemas/question.ts` (schemas) + `src/server/ai/prompts/generate-question.ts` (prompts) |
| `src/lib/essay.ts` | `src/lib/schemas/writing.ts` + `server/services/writing/locate-feedback.ts` + `server/ai/prompts/transcribe-writing.ts`, `chinese-feedback.ts` |
| `src/lib/chinese-score.ts` | `src/server/services/writing/chinese-estimate.ts` |
| `src/lib/corpus.ts` | `src/server/services/retrieval/search-corpus.ts` (pgvector query instead of in-memory) |
| `src/app/api/questions/*`, `src/app/api/essay/*` | Hono routes `questions.ts`, `writing.ts`, `practice.ts` |
| `src/app/questions/page.tsx`, `src/app/essay/page.tsx` | split into `features/practice/*` and `features/writing/*` components |

## 3. Prompt changes
- **Maths question generation:** switch from "plain Unicode, no LaTeX" to **LaTeX in `$…$`**, rendered with KaTeX. Add `topicIds`, `archetypeId`, `markingScheme` (M/A), `taskAnalysis` (解題) and `tips` to the schema.
- **Writing transcription:** accept **any script** (the current prompt assumes Traditional Chinese). Output insertion markers so `transcript-review.tsx` can highlight them.
- **Chinese feedback:** add the 繁簡混用 check (code), a 解題 recap, and vocabulary and structure upgrades.

## 4. Data
- **Corpus:** `scripts/build-corpus.mts` writes to Postgres (`corpus_documents`, `corpus_chunks`) instead of `corpus/<subject>.json`. Transcription stays cached in `corpus/cache/` (git-ignored) to avoid paying twice.
- **Reference data:** `scripts/seed-reference.mts` loads `syllabus/*.json` (maths units, `PHY-*` topics, writing genres and text types) into `topics` and `archetypes`, and loads the rubric criteria into `rubric_criteria`.
- **Accuracy tests** (`scoring-test.mts`, `handwriting-test.mts`, `check-selftest.mts`) run in Node against the same services, using a local Postgres connection string instead of Hyperdrive.

## 5. Deployment
- **Postgres:** Railway (Singapore) with `create extension vector; create extension pg_trgm;`.
- **Cloudflare:**
  - a Hyperdrive config pointing at Railway;
  - an R2 bucket with lifecycle rules (photos deleted after 180 days);
  - Workflows, a KV namespace (embedding cache), and the Rate Limiting binding.
- **Secrets** (`wrangler secret`):
  - `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_TOP`, `OPENROUTER_MODEL_LIGHT`, `OPENROUTER_EMBED_MODEL`;
  - `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`.
- **CI:** typecheck → tests → `drizzle-kit migrate` (against Railway) → `opennextjs-cloudflare deploy`.

## 6. Open items carried over
- **Chinese corpus:** 15 exemplars still need transcribing, then `test:scoring`. This is blocked on OpenRouter credits.
- **Maths:** `syllabus/{math-compulsory,m1,m2}.md` and the maths question-design file are not yet written (Physics is done).
- **Teacher review** of the Chinese and English rubrics and the Physics notes.
