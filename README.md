# Teacher Ops

A local AI tool for HKDSE teachers. It has two features:

- **Question generator**: turns a reference question into new MC or long questions, with figures, code-checked answers and a printable worksheet plus answer key.
- **作文批改 (essay feedback)**: turns photos of a handwritten Chinese essay into an exact transcription, then into 錯別字 (wrong characters), 佳句 (good sentences) and 病句 (problem sentences) feedback, and a printable feedback sheet.

See [SPEC.md](SPEC.md) for what was agreed and what is deliberately left out.

## Setup

```bash
npm install
cp .env.example .env.local   # then put your OpenRouter key in it
npm run dev                  # open http://localhost:3000
```

`OPENROUTER_MODEL` chooses the model. It can be any OpenRouter model that supports image input and structured outputs. The default is `anthropic/claude-opus-5.5`.

## Day-one handwriting test

Before relying on essay feedback, check how well the model reads your students' handwriting:

```
samples/
  essay-01/
    page1.jpg
    page2.jpg
    expected.json   # {"typos": [{"wrong": "己", "correct": "已"}, {"wrong": "勵", "correct": "厲"}]}
```

Then run:

```bash
npm run test:handwriting          # or: npm run test:handwriting path/to/samples
```

The script prints how many of your marked mistakes were caught and any extra flags. It also saves each transcription and its feedback to `samples/<essay>/result.json`. The target is to catch 80% or more. `samples/` is gitignored.

To compare models, change `OPENROUTER_MODEL` in `.env.local` and run the test again.

## Other scripts

- `npm run test:checks`: offline self-test of the answer and figure checker and the essay helpers (no API calls).
- `npm run typecheck`: TypeScript check.
- `npm run build`: production build.

## Layout

| Path | What |
|---|---|
| `src/lib/ai.ts` | OpenRouter call with JSON-schema structured output |
| `src/lib/diagram.ts` | Figure format, rules given to the AI, figure checks |
| `src/lib/questions.ts` | Question schemas and prompts |
| `src/lib/check.ts` | Code verification of generated answers |
| `src/lib/essay.ts` | Transcription markers, essay prompts, mapping feedback onto text |
| `src/components/DiagramView.tsx` | SVG renderer for figures |
| `src/app/questions`, `src/app/essay` | The two pages |
| `src/app/api/*` | Route handlers for each AI step |
