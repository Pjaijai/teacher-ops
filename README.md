# DSE Practice

A practice app for HKDSE students (S4–S6). It generates DSE-style questions, gives AI feedback and marking on students' own work, and tracks each student's weaknesses.

- **Writing (中文 / English):** 解題 and Ask-AI scaffolding (outline, vocabulary, sentence patterns, idioms) → type or upload a photo → exact transcription the student can correct → feedback, optional DSE estimate (beta) → an upgraded Level sample of their own essay.
- **Maths (Compulsory Part):** generate questions by topic, type or reference photo, with answers, an M/A marking scheme, 解題 and tips → MC marked instantly, written working marked mark by mark (beta).
- **Question bank** search, **shared answers** with voting, a **dashboard** of weaknesses and next steps, and daily **credits**.

M1/M2 arrive in v2 and Physics in v3. See [SPEC.md](SPEC.md), [docs/plan.md](docs/plan.md) and [docs/design/](docs/design/).

## Modes

- **local (v1, default):** no database and no sign-in. Students' work, photos and progress are saved in their browser (IndexedDB), with backup export/import in Settings. The server only runs the stateless AI API (`/api/ai/*`). Needs just `OPENROUTER_API_KEY`.
- **cloud (v1.5):** accounts, Postgres, credits, the shared question bank and shared answers. Set `NEXT_PUBLIC_APP_MODE=cloud` at build time; the database steps below apply.

## Local development

```bash
npm install
cp .env.example .env.local     # add OPENROUTER_API_KEY; everything else is optional locally
npm run dev                    # http://localhost:3000
# cloud mode only: npm run db:seed  (creates ./data/pglite and loads topics)
```

- **Database:** without `DATABASE_URL`, the app uses PGlite (Postgres in WASM, with pgvector and pg_trgm) in `./data/pglite`. Migrations run automatically on open. Only one process can open a PGlite directory at a time, so stop the dev server before running scripts against the same directory (or set `PGLITE_DIR`).
- **Sign-in:** without `RESEND_API_KEY`, email sign-in codes are printed in the dev server log. Google sign-in needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **Long AI jobs** run in the background of the dev server; in production they run as Cloudflare Workflows.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run db:seed` | Load the topic tree (maths Learning Units, writing parts, genres, text types) |
| `npm run db:generate` | Generate a Drizzle migration after a schema change |
| `npm run corpus:build -- chi_writing` | Transcribe and embed the HKEAA exemplars into the internal corpus (needs `paper/`, git-ignored) |
| `npm run test:scoring` | Writing level estimate vs held-out HKEAA exemplars |
| `npm run render:pdf -- <pdf> <outDir> [pages]` | Render PDF pages to PNG |
| `npm run typecheck` | TypeScript |

## Deployment

**Local mode (v1):** set the secret `wrangler secret put OPENROUTER_API_KEY`, create the R2 bucket `hkdse-practice-opennext-cache`, then `npm run cf:deploy`. Add a Cloudflare rate-limiting rule on `/api/ai/*`.

**Cloud mode (v1.5, Cloudflare + Railway):** uncomment the Hyperdrive, Workflow and uploads bindings in `wrangler.jsonc`, then:

1. **Postgres on Railway** (Singapore region), then run `create extension vector; create extension pg_trgm;` and `DATABASE_URL=… npx drizzle-kit migrate`, then `DATABASE_URL=… npm run db:seed`.
2. **Cloudflare:**
   - Create a Hyperdrive config pointing at Railway, and put its id in `wrangler.jsonc`.
   - Create the R2 buckets `hkdse-practice-uploads` (with a 180-day lifecycle rule) and `hkdse-practice-opennext-cache`.
   - Set secrets: `wrangler secret put OPENROUTER_API_KEY`, and the same for `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `RESEND_API_KEY`.
   - Set `BETTER_AUTH_URL` and `EMAIL_FROM` in `wrangler.jsonc` vars.
3. `npm run cf:deploy` builds with OpenNext and deploys the Worker (`worker.ts` adds the `JobWorkflow`).

## Layout

| Path | What |
| --- | --- |
| `src/app/[locale]/` | Thin pages (next-intl, `zh-HK` and `en`) |
| `src/app/api/[[...route]]/` | Mounts the Hono API |
| `src/features/<feature>/` | Frontend by feature: `api/use-*.ts` (TanStack Query) and `components/` |
| `src/components/` | shadcn `ui/`, `layout/`, `math/` (KaTeX, Mafs), `diagrams/`, `common/` |
| `src/lib/` | Shared: typed API client, zod schemas, i18n, subjects, credits |
| `src/server/api/` | Hono app, middleware, routes |
| `src/server/services/` | All business logic (the only code that touches the database or the AI) |
| `src/server/jobs/` | Job runner (in-process locally, Cloudflare Workflow in production) |
| `src/server/db/` | Drizzle schema and client (Hyperdrive / postgres.js / PGlite) |
| `rubrics/`, `syllabus/` | Distilled marking rubrics, syllabus topic trees and question-design notes |
| `scripts/` | Offline tools: corpus build, seeding, accuracy tests |
