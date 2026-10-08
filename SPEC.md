# HKDSE practice app — spec

**Version 2, agreed 2026-10-07** in a third design session. It replaces the teacher-only, local plan from 2026-10-06. The rubrics, syllabus, marking rules and scoring decisions from the earlier sessions still apply.

Design documents:
- [Database](docs/design/database.md)
- [API](docs/design/api.md)
- [Frontend](docs/design/frontend.md)
- [Migration from the demo](docs/design/migration.md)

## Product
- **Users are HKDSE students only** (S4–S6, mainly in Hong Kong). There is no teacher role and no classes. Each student has their own history and weakness profile.
- **Free, with daily credits.** Every AI action costs credits (see [credits](#credits)). Every AI call is logged with its cost. Payments can raise the quota later without a redesign.
- **The UI is bilingual: 繁體中文 and English.** Content language depends on the subject:
  - Chinese writing feedback is always in 繁中.
  - English writing feedback is always in English.
  - Maths, M1, M2 and Physics follow the student's exam language, set in their profile.
- **Copyright:** HKEAA past papers and exemplar scripts are used **internally only**, for retrieval, calibration and question patterns. Students see AI-generated questions and AI-written model passages, never reproduced exam text.

## Releases
Changed 2026-10-08: the first milestone has **no database and no sign-in**.

| Release | Contents |
|---|---|
| **v1: local** | Frontend + AI, saved in the browser. **Chinese + English writing**, end to end. **Maths Compulsory Part** practice. Work, photos and the learner profile live in IndexedDB on the student's device, with backup export/import. The server is a stateless AI API (`/api/ai/*`) with a per-IP rate limit. No accounts, no credits, no shared bank or community answers. "Question bank" searches the student's own generated questions. DSE estimates are rubric-only (no exemplar anchors). |
| **v1.5: cloud** | Accounts (Better Auth), Postgres + pgvector, daily credits, shared question bank, shared answers with voting, exemplar-anchored DSE estimates, cross-device history. The code is already built and switched off: set `NEXT_PUBLIC_APP_MODE=cloud`. |
| **v2** | **M1 + M2**: curves and graphs, numeric verification of symbolic answers |
| **v3** | **Physics**: circuit, ray, free-body and wave diagrams, plus the Physics archetypes and marking ([syllabus/physics.md](syllabus/physics.md)) |

Sections below describe the full (cloud) product. In local mode, anything that needs an account or a database is hidden: credits, the shared bank, shared answers and the cloud-only parts of the profile.

## Writing (Chinese, English) — v1
1. **Question.** The student either generates a DSE-style task or enters their own (e.g. a prompt from their teacher). Tasks that can be generated:
   - Chinese 乙部: a genre plus a title or stimulus-scenario prompt.
   - Chinese 甲部: 2–3 generated materials plus a practical-writing task.
   - English Part A: a guided task.
   - English Part B: a chosen text type.

   Generated tasks follow the distilled patterns and go into the shared question bank.
2. **解題 (task analysis), before writing:** what the task asks, the text type, audience, purpose, tone and register, traps, and what to prepare.
3. **Ask-AI helpers:**
   - 寫作大綱 (outline): a paragraph plan.
   - Vocabulary with synonyms.
   - Sentence patterns with a short example.
   - Idioms or 成語 with usage notes.

   **Scaffolding only:** never full paragraphs or a full essay before the student submits.
4. **Submission:** the student types, or uploads photos.
   - Photos are transcribed exactly. The transcription keeps errors, marks `[X?]` unsure and `[X!]` malformed characters, and applies the student's ∨/⋀ insertions, which are highlighted as inserted.
   - The student reviews the transcription next to the photo and **may edit anything**. Every change from the AI's reading is tracked: the original is kept, and edits are shown in the feedback.
5. **Feedback:**
   - A 解題 recap: did the essay meet the task?
   - Strengths.
   - Errors:
     - Chinese: 錯別字, 病句, 佳句, and 繁簡混用 (feedback only; HKEAA accepts mixed scripts, see the rubric).
     - English: errors tagged with the rubric's error taxonomy.
   - Vocabulary and sentence-structure upgrades, each tied to the student's own sentence.
6. **DSE estimate (optional, opt-in, labelled beta):**
   - Marks for each criterion and an estimated level, following [rubrics/chinese-writing.md](rubrics/chinese-writing.md) and [rubrics/english-writing.md](rubrics/english-writing.md).
   - It's calibrated against HKEAA exemplar anchors retrieved from the corpus.
   - **Chinese 甲部 gets feedback only, with no estimate.**
7. **Level sample:** an **upgraded rewrite of the student's own essay**. It keeps their ideas, examples and plan, and is shown side by side with notes on each change. The target is selectable and **defaults to one level above their estimate** (or Level 4 if they didn't ask for an estimate).
8. **Profile update:** criterion scores and error-tag counts (EWMA, so recent work dominates) feed the dashboard's next steps.

## Maths CP (v1), M1/M2 (v2), Physics (v3)
1. **Generate a question:**
   - **by topic** (Learning Unit, or `PHY-*` topic ID);
   - **by question type** (MC, short, long, experiment for Physics; plus difficulty and `*` extension);
   - **from a reference image** (a photo of a worksheet question → "here's what I understood" → variants).

   It's served first from the **shared bank** (questions this student hasn't seen) before generating new ones.
2. **Each question includes:**
   - the question, with LaTeX formulas (KaTeX) and a JSON figure drawn by our renderers;
   - the answer;
   - a **marking scheme** in HKEAA M/A notation, with e.c.f. flags and accepted ranges;
   - **解題 thinking**: how to read the question and which idea unlocks it;
   - **tips** and common traps (for MC, the misconception behind each distractor).
3. **Verification:**
   - Every numeric answer is checked by code: mathjs, units and accepted ranges.
   - M1/M2 symbolic answers are checked by random-point evaluation (derivatives against finite differences, integrals against numeric integration).
   - Proofs, "show that" and explanation parts are marked "not code-verified".
   - Only checked questions enter the shared bank.
4. **Student answer:**
   - **MC** is marked instantly, with no AI. The misconception behind the chosen distractor is shown.
   - **Written work** is uploaded as photos, transcribed to LaTeX line by line, and the student checks it (edits tracked).
   - It's then **marked against the scheme** using HKEAA conventions:
     - M marks (method); A marks need the unit;
     - e.c.f.: method marks follow an earlier error, answer marks only where the scheme says;
     - "show that" earns method marks only;
     - a wrong verdict scores 0 for the whole part;
     - required keywords.
   - The result is a **score per part with a reason for every mark awarded or lost**, the first wrong step highlighted, and a 解題 note.
   - Labelled **"AI-marked, beta"**, with a **dispute** button. Disputes are stored as test data.
5. **Profile update:** mastery per topic ID and misconception tags.

## Question bank search (v1; topics grow with v2/v3)
Students can **browse and search all checked questions in the shared bank** (generated questions only, never past papers):
- **Filters:**
  - subject;
  - **topic**:
    - writing genre and text type (記敘／議論／抒情…, letter / article / blog…), paper part (乙部／甲部, Part A/B);
    - maths Learning Unit;
    - M1/M2 unit;
    - `PHY-*` topic;
  - question type (MC / short / long / experiment / writing task);
  - difficulty; extension `*`; language.
- **Keyword search:** the query is embedded and ranked by pgvector similarity, which works for Chinese and English alike. A trigram match on the question text is used for exact phrases.
- **Results** show the question preview (KaTeX and figures), topic chips, rating, and whether the student has already attempted it. Opening one starts the normal practice or writing flow.
- **Hidden:** private questions (from a student's reference image or "my own question") and reported questions under review.
- **Cost:** browsing and searching are free. Only doing the question costs credits, as usual.

## Shared answers (v1)
- **Visibility:** every writing submission and practice attempt has a visibility setting: **private (default) or public**. The owner can switch it at any time, and switching back to private hides it at once.
- **What a public answer shows:**
  - The **final text only**: the edited transcript or typed text, with the LaTeX rendered for maths. **Photos are never public**.
  - The author's **nickname** (set in the profile, never their account name).
  - The AI score or estimate, and the feedback, **if the author chooses to include them**.
- **Where they appear:** in a "Community answers" tab on the question, **after the viewer has submitted their own attempt**, so they can't copy before trying. It's sorted by votes, then by recency.
- **Voting:** other students can **upvote or downvote** (one vote each; changeable). Authors can't vote on their own answers.
- **Reports:**
  - Reasons: wrong, inappropriate, or contains personal info.
  - **3 or more reports hide** the answer pending review.
  - Text is checked automatically for phone numbers, emails, HKID-like patterns and school names when an answer is made public. Any match blocks publishing until removed.
- **Private-origin questions:** answers to questions from a reference image or "my own question" can't be made public, because the question itself is private.
- **Cost:** making an answer public and voting are free.

## Credits
- **Daily quota:** 100 credits, reset at 00:00 HKT.
- **Costs:**

  | Action | Credits |
  |---|---|
  | Generate a question from the bank | 0 |
  | Generate a new question | 2 |
  | 解題 | 1 |
  | One helper (outline, vocab, sentences, idioms) | 2 |
  | Transcribe a photo page | 3 |
  | Feedback | 8 |
  | DSE estimate | +5 |
  | Level sample | 10 |
  | Reference-image understanding | 2 |
  | Mark written work (per question) | 5 |
  | MC | 0 |
- **Model routing** (`server/ai/models.ts`):
  - Light tasks (helpers, 解題, question generation) use a cheaper model.
  - Transcription, grading, marking and the level sample use the top model.

  Both are OpenRouter model IDs from env vars.

## Stack
- **Next.js 16 App Router** on **Cloudflare Workers** via OpenNext. Long jobs (grading, marking, level samples) run as **Cloudflare Workflows** and stream progress to the UI.
- **Postgres + pgvector on Railway** (Singapore), reached through **Cloudflare Hyperdrive**. **Drizzle** is the ORM, with `drizzle-kit` migrations.
- **Cloudflare R2** stores uploads (signed upload URLs).
- **Better Auth:** Google and email one-time code. Codes are sent via Resend.
- **Hono** API mounted at `/api/[[...route]]`, validated with zod, with a typed `hc` client. **TanStack Query** on the frontend.
- **shadcn/ui** + Tailwind. **next-intl** (`zh-HK`, `en`). **KaTeX** for formulas. **Mafs** for function graphs. Our own JSON-driven SVG components for geometry, circuits, ray diagrams, free-body diagrams and waves.
- **Kebab-case file names everywhere** (`question-card.tsx`, `grade-chinese.ts`).
- **Offline scripts** (`scripts/`) render PDFs, build the corpus and run the accuracy tests. They write to Postgres; the deployed app only reads the corpus.
- **Privacy (HK PDPO, minors):**
  - Collect only email, display name, form, subjects, exam language, and an optional public nickname.
  - Student work is private to the student (enforced in every query).
  - Students can delete their account and all their data.

## Knowledge base
Unchanged from v1 of the spec, now loaded into Postgres:
- `rubrics/chinese-writing.md` and `rubrics/english-writing.md`.
- `syllabus/*.md` + `.json`: maths Learning Units, `PHY-*` topics, question-design notes.
- The corpus (exemplars and past questions): chunked, embedded, and split into anchor and test sets.

The test split is never retrieved.

## Success criteria
| Piece | Bar | Before |
|---|---|---|
| Writing level estimate | ≥ 70% exact, ≥ 95% within ±1 on held-out exemplars | Dropping "beta" |
| 錯別字 detection | ≥ 80% recall, few false alarms | v1 launch |
| Transcription | ≤ 1% character error on a spot-check | v1 launch |
| Generated questions | 100% of numeric answers pass the code check; figures match the numbers | Entering the bank |
| Written-work marking | Within ±1 mark of a human marker per question on a collected marked set | Dropping "beta" |
| Disputes | Rate tracked per subject; reviewed weekly | Ongoing |

## Out of scope for now
- Teacher accounts and classes.
- Payments (the credits are designed for them).
- Chinese 甲部 DSE estimate.
- 3D solids.
- Word export.
- Showing real past-paper questions (needs a licence).
