# Teacher Ops — spec

First agreed on 2026-10-06 (demo). Extended the same day in a second design session, adding multi-subject support, scoring and the practice loop. Design details: [API](docs/design/api.md) · [Database](docs/design/database.md).

## Goal
A **score → feedback → practice → re-score loop** for HKDSE (F4–F6):

| Subject | Scope | Build order |
|---|---|---|
| Chinese writing (中文寫作) | Paper 2 乙部 first, 甲部 later | 1 |
| English writing | Paper 2 Part A + Part B | 2 |
| Maths Compulsory Part | Paper 1 + Paper 2 (MC) | 3 |
| M1 (Calculus & Statistics) | Full module | 4 |
| M2 (Algebra & Calculus) | Full module | 5 |

## Phases
- **Phase 1:** only the teacher uses it, locally (`npm run dev`), with no login. The teacher uploads work and prints feedback and practice. Student history is saved.
- **Phase 2:** students use it directly (deployed, with accounts). This is **gated on passing the teacher-marked test set** (see Success criteria).

## Stack
- All TypeScript, Next.js App Router. AI calls and embeddings go through **OpenRouter** (`OPENROUTER_MODEL`; embeddings with a `qwen3-embedding` model).
- **No database engine in Phase 1.** Data is plain JSON files (`data/`, `corpus/`). The schema is designed for Postgres + pgvector in Phase 2 but not implemented. All access goes through one store module.
- **Git:** `paper/` (HKEAA material), `corpus/` (transcriptions derived from it), `data/` and `samples/` are git-ignored. The distilled `rubrics/`, `syllabus/` and build scripts are committed.

## Knowledge base (distilled from `paper/` + public HKEAA/EDB documents)
- `rubrics/chinese-writing.md` and `rubrics/english-writing.md`: official criteria and level descriptors, with concrete per-level markers distilled from the HKEAA level exemplars, each citing its exemplar. Marks for each criterion are our estimate (the exemplars give only an overall level). A subject teacher reviews them.
- `syllabus/{math-compulsory,m1,m2}.md` + `.json`: Learning Units from the EDB *Curriculum and Assessment Guide*, used as topic IDs. Finer sub-skills are added later where diagnosis needs them.
- `syllabus/<subject>-question-design.md`: question archetypes per unit, (a)/(b)/(c) scaffolding, marks and sections, **MC distractor patterns**, with citations (from the Level 5 Paper 1 scripts 2020–25 and MC Paper 2 2016–23).
- `corpus/<subject>.json`: everything transcribed, chunked (paragraph or question), tagged and embedded. Exemplars are split into **anchor** and held-out **test** sets.

## RAG
Retrieval runs in memory over the JSON corpus: metadata filter, then cosine ranking. It serves three purposes:
1. **Calibration:** anchor exemplars near the estimated level, used when scoring.
2. **Improvement models:** higher-level passages for the student's weakest criteria.
3. **Practice:** past questions by genre, or by Learning Unit and archetype.

The test split is never retrieved.

## Writing (Chinese, English)
1. Photos → exact transcription (`[X?]` unsure, `[X!]` malformed) → optional teacher check.
2. **Scores for each criterion** plus an estimated overall level, each with a reason that cites the retrieved anchors. This is shown as an estimate, and the teacher can override it.
3. Feedback:
   - Chinese: 錯別字 (wrong characters), 病句 (problem sentences), 佳句 (good sentences), overall comment, and **繁簡混用 (mixed scripts)**.
   - English: tagged errors, strengths, overall comment.
   - Both: improvement-model passages.
4. **Chinese script rule:** either Traditional or Simplified is allowed, but the essay must be consistent. The dominant script is found by counting characters that differ between the scripts (shared characters and HK variants such as 着/著 are neutral). Every minority-script character is flagged with its dominant-script form in a separate category, 「繁簡混用」, not counted as 錯別字. This is **feedback only**: the DSE estimate follows HKEAA, which accepts mixed scripts and counts only 繁簡同體 (one character blending both scripts) as 錯別字. If the split is close, flag against the majority and add a note. Feedback is always written in Traditional Chinese.
5. Practice loop: **revise and resubmit** (a before/after comparison) → **targeted drills** on the weakest criterion or error tags, with a model passage → **new essay** from a retrieved past question. Phase 1 builds revise + drills first. Drills are printed, and completed drills come back as photos.

## Maths (Compulsory Part, M1, M2)
- The existing question generator gains `subject`, Learning Unit tags and generation from an archetype "blueprint" (with no reference screenshot needed).
- The loop: diagnose weak units → generate or retrieve a worksheet → mark → update mastery.
- Marking, **phase A:** final answers only (MC letters + numeric), typed or read from a photo of the answer grid. Misconceptions are inferred from the chosen distractor. **Phase B (later):** marking handwritten working against a DSE-style marking scheme (M/A marks).
- Verification stays all TypeScript:
  - Numeric answers: mathjs (existing).
  - Symbolic answers (M1/M2): random-point evaluation. Derivatives are checked against finite differences and integrals against numeric integration.
  - Statistics: exact formulas.
  - Proofs and "show that" questions are flagged as **not code-verified**, for teacher review.
- Figures: curves (sampled from expressions) and circles are added for M1/M2 and Compulsory Part.

## Student record
Each student has a class and class number. A record holds their submissions (AI and teacher values both kept; the teacher's value wins) and a derived profile:
- Criterion scores (EWMA, so the last ~5 attempts dominate),
- Decaying error-tag counts,
- Mastery per Learning Unit,
- Recommendations.

Combining all students gives the class summary (for example, the most common 錯別字).

## Success criteria (automated tests)
| Piece | Bar | Test set |
|---|---|---|
| Writing level (Chinese, English) | ≥ 70% exact, ≥ 95% within ±1 | Held-out HKEAA exemplars; **Phase 2 gate: the teacher-marked set** (~10 Chinese + ~10 English essays) |
| 錯別字 detection | ≥ 80% recall, few false alarms | `samples/` (`npm run test:handwriting`) |
| 繁簡混用 | ≥ 95% | Synthetic mixed essays |
| Maths MC/numeric | 100% pass the code check | Generated questions |
| M1/M2 non-proof answers | 100% pass numeric verification | Generated questions |
| Corpus transcription | ≤ 1% character error | 10% spot-check |

## Material
- **Already in `paper/`:**
  - Chinese and English Paper 2 level exemplars, 2020–25.
  - Level 5 Paper 1 scripts for Compulsory Part, M1 and M2, 2020–25.
  - Compulsory Part Paper 2 (MC), 2016–23.
- **Needed from the teacher:**
  - Teacher-marked student essays.
  - Review of the distilled rubrics.
  - *Optional:* MC 2024–25 and Paper 1 marking schemes.
- **Tooling:** poppler (`pdftoppm`) to render the scanned PDFs.

## Out of scope for now
Chinese 甲部 scoring, marking handwritten maths working, 3D solids, Word export, Phase 2 accounts and deployment.
