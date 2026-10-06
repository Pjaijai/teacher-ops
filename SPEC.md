# Teacher Ops — spec (demo)

Agreed in a design session on 2026-10-06.

## Context
- Personal tool for one teacher (or a few), Hong Kong **HKDSE, F4–F6**.
- **Local first**: runs on the teacher's machine with `npm run dev`. Nothing is deployed.
- **All TypeScript**: Next.js (App Router). AI calls go through **OpenRouter**, and the model is set by `OPENROUTER_MODEL`.
- No database, no login, no special privacy handling (the user chose this; it's a known trade-off). Work is lost when the page is refreshed.

## Feature 1 — Question generator
1. **Input**: a screenshot (paste, drop or pick a file) and/or typed text of a reference question.
2. **"Here's what I understood"** step: the question text, topic, key idea and figure, all editable. The figure can be edited as JSON.
3. **Generate** with these settings:
   - Variation level: 1 Number swap · 2 Context swap · 3 Structure variant.
   - Type: MC (4 options, with distractors based on real student mistakes) or long question.
   - Language: English or Traditional Chinese, using DSE terminology.
   - Count: 1–10.
4. **Figures**: the AI outputs a structured diagram (points, segments, right-angle marks, angle marks, axes). Our React SVG renderer draws it.
   - Supported: 2D straight-line figures, combined triangles and the coordinate plane.
   - Circles, 3D and curves are flagged as unsupported.
5. **Checked answers**: every numeric answer comes with a mathjs expression over named givens, and code verifies it:
   - The arithmetic.
   - That the displayed answer matches the computed value.
   - That the MC key is correct and the options are distinct.
   - That the figure's lengths and right angles match its labels.

   Failing questions get one automatic repair round. Anything still failing is shown as "check failed".
6. **Output**: a printable worksheet and a separate answer key (with solutions and distractor notes), via browser print → Save as PDF.

## Feature 2 — Chinese essay feedback (作文批改)
1. **Input**: photos of one essay, with pages in order.
2. **Exact transcription**: the AI copies what the student wrote and never fixes it.
   - `[X?]` marks an unsure reading.
   - `[X!]` marks a malformed character (錯字).
3. **Teacher check**: photo side by side with the editable text, with unsure characters highlighted. This step can be skipped.
4. **Analysis**:
   - 錯別字 (wrong characters), with the correct character and an explanation.
   - 佳句 (good sentences), with the reason.
   - 病句 (problem sentences), with the issue and a rewrite.
   - An overall comment.
   - No score and no punctuation feedback.
5. **Display**: feedback is marked on the transcribed text (not on the photo). Each item can be edited or removed.
6. **Output**: a printable feedback sheet for each student.

## Later (not in the demo)
Batch class sets, a class summary of common 錯別字, Word export, 3D solids, circles, DSE scoring, saved history and deployment.

## Success criteria
- Essays: catch ≥ 80% of the teacher's marked 錯別字 with few false alarms (`npm run test:handwriting`).
- Questions: every answer passes the code check, figures match the numbers, and the worksheet prints cleanly on A4.
