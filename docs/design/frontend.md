# Frontend design and file layout

Status: **designed, not implemented.**

**Stack:** Next.js 16 App Router · shadcn/ui + Tailwind · TanStack Query · next-intl (`zh-HK`, `en`) · KaTeX · Mafs · our own SVG diagram components.

**Rules:**
- Every file name is kebab-case.
- Server Components fetch nothing from the database directly. All data goes through the Hono API, using TanStack Query in Client Components.
- Pages are thin shells that compose feature components.

## Navigation
Sidebar entries (shown according to `profile.subjects`): **Dashboard · Writing · Practice · Question bank · History · Settings**. The top bar has the **credits badge** (balance and reset time), the language toggle and the avatar menu.

## Pages and flows

### Onboarding
`/[locale]/sign-in` offers Google or an email code. After the first sign-in, `/onboarding` asks for the form, subjects, exam language and an optional nickname.

### Dashboard — `/dashboard`
- A subject switcher.
- **Weakness profile:**
  - writing criteria (radar or bars);
  - top error tags with counts;
  - topic mastery (heatmap by Learning Unit or `PHY-*` topic).
- **Next steps:** cards like "Revise your last 議論文's 結構", "Practise CP-NF7 quadratic equations", "Try a 甲部 演講辭".

### Writing — `/writing`
1. **Pick a task** (tabs):
   - **Generate**: subject, part, genre or text type.
   - **Question bank** (a search panel filtered to writing).
   - **My own question**: paste the prompt and optional materials.
2. **Task page** `/writing/[questionId]`:
   - **Left:** the task, with materials for 甲部 and Part A.
   - **Right:** the helper panel (tabs): **解題**, **寫作大綱**, **Vocabulary**, **Sentence patterns**, **Idioms / 成語**. Each tab has an "Ask AI" button showing its credit cost; results are cached. A banner says "Scaffolding only — write it yourself."
   - **Bottom:** write in the editor, or upload photos.
3. **Review** `/writing/submissions/[id]` (status `review`):
   - Photo viewer next to the editable transcript.
   - Unsure characters are highlighted yellow, insertions are underlined and tagged "inserted", and edits are shown as tracked changes.
   - A "DSE estimate (beta)" checkbox and **Submit for feedback**, both showing their credit cost.
4. **Feedback** (same URL, status `graded`):
   - Marks are drawn on the text: 錯別字 red, 病句 amber, 佳句 green, 繁簡混用 purple, English error tags.
   - Side panel: 解題 recap, strengths, vocabulary and structure upgrades (each linked to its sentence), DSE estimate card (marks per criterion, level, "beta").
   - Actions:
     - **Generate Level sample** (target level selector).
     - **Revise and resubmit**, which creates a child submission.
     - **Make public…**
5. **Sample compare:** a two-column diff of the original and the sample. Hovering a change shows its note.

### Practice — `/practice`
1. **Generate** (tabs):
   - **By topic**: topic tree picker.
   - **By type**: MC, short, long, experiment; difficulty; extension.
   - **From reference image**: upload → "here's what I understood" (editable, figure JSON preview) → variation level and count.
2. **Question** `/practice/[questionId]`:
   - The question with KaTeX and the figure.
   - **MC:** choose an option, get the result instantly, and see the misconception behind it.
   - **Written answer:** upload photos → review the LaTeX transcript line by line (rendered next to the raw LaTeX, editable) → **Mark**.
   - Tabs after the attempt: **Solution** (answer, marking scheme, 解題 thinking, tips) and **Community answers**.
3. **Result** `/practice/attempts/[id]`:
   - Score for each part.
   - Mark-by-mark table (M/A, ✓/✗, reason). The first wrong line is highlighted in the transcript.
   - The 解題 note for each part.
   - **Dispute** on any mark, and **Make public…**

### Question bank — `/bank`
- **Search bar** (free text, any language).
- **Filters:**
  - subject;
  - **topic tree**: writing genres, text types and parts; CP and M1/M2 Learning Units; `PHY-*` topics;
  - kind, difficulty, extension, language;
  - "unattempted only".
- **Sort:** relevance, top rated, newest.
- **Result cards:** KaTeX and figure preview, topic chips, rating, an "attempted" badge. Infinite scroll uses `useInfiniteQuery`. A card opens the writing or practice flow.

### Community answers (a tab on the question)
- **Locked until the viewer has submitted their own answer**, with an explanation.
- Answers sorted by top or new, showing nickname, body (rendered), and the optional score and feedback summary.
- **▲ / ▼ voting** with an optimistic update, and **Report**.

### History — `/history`
Submissions and attempts, filtered by subject or status, with links to each result and a visibility toggle.

### Settings — `/settings`
Profile, nickname, subjects, exam language, UI language, extension track, credit history, and **delete account**.

## State and data
- **TanStack Query** for all server state.
  - Query keys come from `lib/query-keys.ts` (e.g. `['submission', id]`, `['bank', filters]`).
  - Mutations invalidate the relevant keys.
  - Voting uses optimistic updates.
- **Long jobs:** `useJobStream(jobId)` opens an EventSource, shows step progress (`job-progress.tsx`), and invalidates the resource query on `done`.
- **Credits:** `useCredits()` reads `/me`. Every AI button shows its cost and is disabled when the balance is too low. A 402 response opens the "out of credits" dialog.
- **URL state:** bank filters and sort live in search params, so search results can be linked.
- **Local UI state** (tabs, editor drafts) uses React state. Unsent drafts are autosaved to `localStorage`.

## File layout (whole repo)
```
src/
  proxy.ts                                  # next-intl locale routing + optimistic auth redirect (Next 16 "proxy")
  app/
    [locale]/
      layout.tsx                            # html lang, providers (query-provider, intl)
      (auth)/sign-in/page.tsx
      (auth)/onboarding/page.tsx
      (app)/layout.tsx                      # app-shell: sidebar, top bar, credits badge
      (app)/dashboard/page.tsx
      (app)/writing/page.tsx
      (app)/writing/[questionId]/page.tsx
      (app)/writing/submissions/[id]/page.tsx
      (app)/practice/page.tsx
      (app)/practice/[questionId]/page.tsx
      (app)/practice/attempts/[id]/page.tsx
      (app)/bank/page.tsx
      (app)/history/page.tsx
      (app)/settings/page.tsx
    api/[[...route]]/route.ts               # export GET/POST/PATCH/PUT/DELETE = handle(app)
    globals.css                             # tailwind + shadcn theme tokens

  features/                                 # FRONTEND, grouped by feature
    writing/
      api/use-writing-helpers.ts            # useHelper(questionId, kind)
      api/use-submission.ts                 # useSubmission, useCreateSubmission, useSubmit, useSample
      components/task-picker.tsx
      components/task-view.tsx
      components/helper-panel.tsx           # tabs: 解題 / 大綱 / vocab / sentence patterns / idioms
      components/writing-editor.tsx
      components/transcript-review.tsx     # photo + editable text, unsure/insert highlights, tracked edits
      components/feedback-view.tsx         # marks on text + side panel
      components/feedback-mark.tsx
      components/dse-estimate-card.tsx
      components/upgrade-list.tsx          # vocab + structure upgrades
      components/sample-compare.tsx
    practice/
      api/use-practice-question.ts          # useNextQuestion, useQuestion, useSolution
      api/use-attempt.ts                    # useAttempt, useAnswerMc, useUploadPages, useMark, useDispute
      api/use-reference.ts                  # from-reference flow
      components/generate-panel.tsx         # by topic / by type / reference image
      components/topic-tree-picker.tsx
      components/reference-understanding.tsx
      components/question-view.tsx
      components/mc-options.tsx
      components/latex-transcript-review.tsx
      components/mark-breakdown.tsx
      components/solution-view.tsx         # answer, marking scheme, 解題, tips
      components/dispute-dialog.tsx
    bank/
      api/use-bank-search.ts                # useInfiniteQuery
      components/bank-search-bar.tsx
      components/bank-filters.tsx
      components/question-preview-card.tsx
    community/
      api/use-community-answers.ts          # list, vote (optimistic), report, publish
      components/community-answers.tsx
      components/answer-card.tsx
      components/vote-buttons.tsx
      components/publish-dialog.tsx        # nickname check, include score/feedback, personal-info warning
    dashboard/
      api/use-dashboard.ts
      components/criterion-chart.tsx
      components/error-tag-list.tsx
      components/topic-heatmap.tsx
      components/next-step-list.tsx
    account/
      api/use-me.ts                         # useMe, useCredits, useUpdateProfile, useDeleteAccount
      components/onboarding-form.tsx
      components/settings-form.tsx
      components/credits-badge.tsx
      components/out-of-credits-dialog.tsx
    jobs/
      api/use-job-stream.ts
      components/job-progress.tsx

  components/
    ui/                                     # shadcn generated (button.tsx, dialog.tsx, tabs.tsx, …)
    layout/app-shell.tsx, app-sidebar.tsx, top-bar.tsx, locale-switcher.tsx
    common/image-uploader.tsx               # R2 presigned upload, compression, page order
    common/photo-viewer.tsx
    math/katex-text.tsx                     # Markdown + $…$ rendering
    math/mafs-graph.tsx                     # function graphs from GraphSpec (v1 basic, v2 curves/regions)
    diagrams/diagram-view.tsx               # dispatch on DiagramSpec.kind
    diagrams/geometry-diagram.tsx           # v1 (from current DiagramView; adds circles/arcs)
    diagrams/circuit-diagram.tsx            # v3
    diagrams/ray-diagram.tsx                # v3
    diagrams/free-body-diagram.tsx          # v3
    diagrams/wave-graph.tsx                 # v3
    providers/query-provider.tsx

  lib/                                      # SHARED (client + server), pure
    api-client.ts                           # hc<AppType>
    query-keys.ts
    schemas/                                # zod: question.ts, writing.ts, practice.ts, community.ts, me.ts, diagram.ts
    diagram/diagram-spec.ts                 # DiagramSpec + GraphSpec types
    diagram/check-diagram.ts                # figure-vs-numbers checks
    i18n/routing.ts, request.ts
    utils.ts                                # shadcn cn()

  server/                                   # BACKEND only (import "server-only")
    api/
      app.ts                                # Hono root; export type AppType
      middleware/with-db.ts, with-session.ts, with-rate-limit.ts
      routes/me.ts, reference.ts, questions.ts, writing.ts, practice.ts,
             community.ts, uploads.ts, jobs.ts, dashboard.ts
    auth/auth.ts                            # Better Auth config (Google + email OTP, Drizzle adapter)
    db/
      client.ts                             # drizzle(postgres(env.HYPERDRIVE.connectionString))
      scoped.ts                             # user-scoped query helpers
      schema/enums.ts, auth.ts, profile.ts, reference.ts, questions.ts,
             writing.ts, practice.ts, community.ts, learner.ts, jobs.ts, corpus.ts, index.ts
    ai/
      open-router.ts                        # askStructured (from current src/lib/ai.ts) + cost logging
      embed.ts
      models.ts                             # task → model routing
      prompts/                              # chinese-feedback.ts, english-feedback.ts, task-analysis.ts,
                                            # writing-helpers.ts, level-sample.ts, transcribe-writing.ts,
                                            # transcribe-math.ts, generate-question.ts, mark-answer.ts
    services/
      credits/charge-credits.ts, credit-balance.ts
      writing/task-analysis.ts, writing-helpers.ts, transcribe-writing.ts, track-edits.ts,
              script-check.ts (繁簡), chinese-feedback.ts, english-feedback.ts,
              chinese-estimate.ts, english-estimate.ts, level-sample.ts, locate-feedback.ts
      practice/question-bank.ts, generate-question.ts, reference-understand.ts,
               check-answer.ts (mathjs + units), check-symbolic.ts (v2), mark-mc.ts,
               transcribe-math.ts, mark-answer.ts, disputes.ts
      bank/search-questions.ts              # filters + vector + trigram, RRF merge
      community/publish-answer.ts, vote-answer.ts, report-answer.ts, personal-info-check.ts
      learner/update-profile.ts, next-steps.ts
      retrieval/search-corpus.ts
      uploads/r2.ts
    jobs/
      transcribe-workflow.ts, writing-feedback-workflow.ts, level-sample-workflow.ts,
      mark-answer-workflow.ts, generate-question-workflow.ts, job-progress.ts

  messages/en.json, zh-HK.json

worker.ts                                   # OpenNext worker entry + export Workflow classes
wrangler.jsonc                              # Hyperdrive, R2, Workflows, KV, rate-limit bindings
open-next.config.ts
drizzle.config.ts
drizzle/                                    # generated migrations
scripts/                                    # offline (Node): render-pdf.mts, build-corpus.mts,
                                            # seed-reference.mts, scoring-test.mts, handwriting-test.mts, check-selftest.mts
rubrics/  syllabus/  docs/  paper/ (ignored)  corpus/ (ignored)
```

## Release mapping
| Release | New frontend work |
|---|---|
| **v1** | Shell, account, onboarding, dashboard; all of writing; practice for **Maths CP** (geometry diagrams, basic Mafs graphs); bank search; community answers |
| **v2** | `mafs-graph.tsx` curves, regions and asymptotes; M1/M2 topic trees; symbolic answer display |
| **v3** | `circuit-diagram.tsx`, `ray-diagram.tsx`, `free-body-diagram.tsx`, `wave-graph.tsx`; Physics topic tree; experiment question type |
