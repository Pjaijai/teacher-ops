/**
 * How well does the Chinese scorer agree with HKEAA's levels?
 * Scores every held-out exemplar (split "test", never retrieved as an anchor) from its corpus
 * transcription, so this measures scoring only, not handwriting reading.
 *
 *   npm run test:scoring
 *
 * Target (SPEC.md): ≥ 70% exact level, ≥ 95% within ±1. Results go to corpus/cache/scoring-results.json.
 */
import fs from "node:fs";
import { scoreChinese, type ChineseScore } from "../src/lib/chinese-score";
import { loadCorpus } from "../src/lib/corpus";

try { process.loadEnvFile(".env.local"); } catch { /* rely on the environment */ }

const tests = loadCorpus("chi_writing").documents.filter((d) => d.split === "test");
if (tests.length === 0) throw new Error("No test documents in the corpus.");

const results: { id: string; expected: number; got: number; total: number; score: ChineseScore }[] = [];
await Promise.all(
  tests.map(async (doc) => {
    const score = await scoreChinese({ text: doc.text, questionNo: doc.questionNo });
    results.push({ id: doc.id, expected: doc.level!, got: score.level, total: score.total, score });
  }),
);
results.sort((a, b) => a.id.localeCompare(b.id));

console.log("exemplar          HKEAA  ours  total/103  內容 表達 結構 標點 錯字");
for (const r of results) {
  const c = r.score.criteria;
  const mark = r.got === r.expected ? " " : Math.abs(r.got - r.expected) === 1 ? "~" : "✗";
  console.log(
    `${r.id.padEnd(16)}  L${r.expected}     L${r.got} ${mark}  ${String(r.total).padStart(4)}       ` +
      `${c.content.grade.padEnd(4)} ${c.expression.grade.padEnd(4)} ${c.structure.grade.padEnd(4)} ${c.presentation.grade.padEnd(4)} ${r.score.wrongCharMarks}`,
  );
}
const exact = results.filter((r) => r.got === r.expected).length;
const within1 = results.filter((r) => Math.abs(r.got - r.expected) <= 1).length;
const pct = (n: number) => `${Math.round((100 * n) / results.length)}%`;
console.log(`\nExact: ${exact}/${results.length} (${pct(exact)}, target ≥ 70%)   Within ±1: ${within1}/${results.length} (${pct(within1)}, target ≥ 95%)`);

// Does the mark total order the scripts the same way the levels do? (input for a total→level mapping)
for (const level of [5, 4, 3, 2, 1]) {
  const totals = results.filter((r) => r.expected === level).map((r) => r.total);
  if (totals.length) console.log(`L${level} totals: ${totals.join(", ")}`);
}
fs.writeFileSync("corpus/cache/scoring-results.json", JSON.stringify(results, null, 2));
