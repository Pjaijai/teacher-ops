/**
 * How well does the Chinese DSE estimate agree with HKEAA's levels?
 * Scores every held-out exemplar (split "test" in corpus_documents, never retrieved as an anchor)
 * from its corpus transcription, so this measures scoring only, not handwriting reading.
 * Runs the production path: AI feedback (for the 錯別字 count) → estimate with pgvector anchors.
 *
 *   npm run test:scoring                 (feedback + estimate, as in the app)
 *   npm run test:scoring -- --fast       (estimate only; 錯別字 mark assumes no errors)
 *
 * Target (SPEC.md): ≥ 70% exact level, ≥ 95% within ±1. Results go to corpus/cache/scoring-results.json.
 * Needs the corpus in the database first: npm run corpus:build -- chi_writing [--from-json]
 */
import fs from "node:fs";
import { and, eq } from "drizzle-orm";
import { stripMarkers } from "../src/features/writing/lib/text-markers";
import { getDb } from "../src/server/db/client";
import { corpusDocuments } from "../src/server/db/schema";
import { chineseFeedback } from "../src/server/services/writing/chinese-feedback";
import { estimateChinese, type EstimateResult } from "../src/server/services/writing/chinese-estimate";
import { checkScript } from "../src/server/services/writing/script-check";

try { process.loadEnvFile(".env.local"); } catch { /* rely on the environment */ }

const fast = process.argv.includes("--fast");
const db = await getDb();
const tests = await db
  .select()
  .from(corpusDocuments)
  .where(and(eq(corpusDocuments.subject, "chi_writing"), eq(corpusDocuments.split, "test")));
if (tests.length === 0) throw new Error("No test documents in the corpus. Run: npm run corpus:build -- chi_writing --from-json");

const noUsage = () => {};
const results: { id: string; expected: number; got: number; total: number; estimate: EstimateResult; wrongChars: number }[] = [];
await Promise.all(
  tests.map(async (doc) => {
    const task = `乙部 命題寫作，第${doc.questionNo ?? "?"}題（題目從考生答卷推斷）`;
    const essay = stripMarkers(doc.text);
    const wrongChars = fast
      ? []
      : (await chineseFeedback({ essay, task, script: checkScript(essay.clean), onUsage: noUsage })).wrongChars;
    const estimate = await estimateChinese({ db, text: essay.clean, task, genre: doc.genre, wrongChars, onUsage: noUsage });
    results.push({ id: doc.id, expected: doc.level!, got: estimate.level, total: estimate.totalMarks, estimate, wrongChars: wrongChars.length });
  }),
);
results.sort((a, b) => a.id.localeCompare(b.id));

console.log("exemplar          HKEAA  ours  total/103  內容 表達 結構 標點 錯字");
for (const r of results) {
  const g = (c: string) => r.estimate.scores.find((s) => s.criterion === c)!;
  const mark = r.got === r.expected ? " " : Math.abs(r.got - r.expected) === 1 ? "~" : "✗";
  console.log(
    `${r.id.padEnd(16)}  L${r.expected}     L${r.got} ${mark}  ${String(r.total).padStart(4)}       ` +
      `${g("content").grade.padEnd(4)} ${g("expression").grade.padEnd(4)} ${g("structure").grade.padEnd(4)} ${g("presentation").grade.padEnd(4)} ${g("wrong_chars").marks}`,
  );
}
const exact = results.filter((r) => r.got === r.expected).length;
const within1 = results.filter((r) => Math.abs(r.got - r.expected) <= 1).length;
const pct = (n: number) => `${Math.round((100 * n) / results.length)}%`;
console.log(`\nExact: ${exact}/${results.length} (${pct(exact)}, target ≥ 70%)   Within ±1: ${within1}/${results.length} (${pct(within1)}, target ≥ 95%)`);

// Does the mark total order the scripts the same way the levels do? (input for the total→level mapping)
for (const level of [5, 4, 3, 2, 1]) {
  const totals = results.filter((r) => r.expected === level).map((r) => r.total);
  if (totals.length) console.log(`L${level} totals: ${totals.join(", ")}`);
}
fs.mkdirSync("corpus/cache", { recursive: true });
fs.writeFileSync("corpus/cache/scoring-results.json", JSON.stringify(results, null, 2));
process.exit(0);
