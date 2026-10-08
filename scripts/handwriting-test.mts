/**
 * Day-one test: how well does the AI keep (and then catch) students' wrong characters?
 * Runs the production path: exact transcription (top model) → Chinese feedback → located 錯別字.
 *
 * Layout:
 *   samples/<essay-name>/page1.jpg, page2.jpg, ...   (pages sorted by file name)
 *   samples/<essay-name>/expected.json               {"typos": [{"wrong": "己", "correct": "已"}, ...]}
 *
 * Run:  npm run test:handwriting [samples-dir]
 * Writes each transcription + feedback to samples/<essay-name>/result.json.
 */
import fs from "node:fs";
import path from "node:path";
import { countUnsure, stripMarkers } from "../src/features/writing/lib/text-markers";
import type { ImageInput } from "../src/server/ai/open-router";
import { chineseFeedback } from "../src/server/services/writing/chinese-feedback";
import { checkScript } from "../src/server/services/writing/script-check";
import { transcribeWriting } from "../src/server/services/writing/transcribe-writing";

try { process.loadEnvFile(".env.local"); } catch { /* rely on the environment */ }

const dir = process.argv[2] ?? "samples";
const mediaTypes: Record<string, ImageInput["mediaType"]> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
};

type Pair = { wrong: string; correct: string };
const key = (p: Pair) => `${p.wrong}→${p.correct}`;
const noUsage = () => {};

let totalExpected = 0, totalHit = 0, totalExtra = 0;

for (const name of fs.readdirSync(dir).sort()) {
  const essayDir = path.join(dir, name);
  if (!fs.statSync(essayDir).isDirectory()) continue;
  const pages = fs.readdirSync(essayDir).filter((f) => mediaTypes[path.extname(f).toLowerCase()]).sort();
  if (pages.length === 0) continue;

  const images: ImageInput[] = pages.map((f) => ({
    mediaType: mediaTypes[path.extname(f).toLowerCase()],
    data: fs.readFileSync(path.join(essayDir, f)).toString("base64"),
  }));

  console.log(`\n=== ${name} (${pages.length} page${pages.length > 1 ? "s" : ""}) ===`);
  const transcription = await transcribeWriting({ subject: "chi_writing", images, onUsage: noUsage });
  const essay = stripMarkers(transcription.text);
  const feedback = await chineseFeedback({
    essay,
    task: transcription.title ? `題目：${transcription.title}` : "（題目不詳）",
    script: checkScript(essay.clean),
    onUsage: noUsage,
  });
  fs.writeFileSync(path.join(essayDir, "result.json"), JSON.stringify({ transcription, feedback }, null, 2));

  // Malformed characters ([X!]) count as X→X.
  const found: Pair[] = feedback.rows.flatMap((r) => {
    if (r.kind !== "wrong_char") return [];
    const p = r.payload as { wrong: string; correct: string };
    return [{ wrong: p.wrong, correct: p.correct }];
  });
  console.log(`Unsure characters flagged: ${countUnsure(transcription.text)}; malformed: ${essay.malformed.length}`);
  console.log(`Found: ${found.map(key).join("  ") || "(none)"}`);

  const expectedFile = path.join(essayDir, "expected.json");
  if (!fs.existsSync(expectedFile)) { console.log("(no expected.json — skipping score)"); continue; }
  const expected: Pair[] = JSON.parse(fs.readFileSync(expectedFile, "utf8")).typos;

  // Multiset match on wrong→correct; malformed characters match on the correct character alone.
  const pool = [...found];
  let hit = 0;
  const missed: Pair[] = [];
  for (const e of expected) {
    const i = pool.findIndex((f) => key(f) === key(e) || (f.wrong === f.correct && f.correct === e.correct));
    if (i >= 0) { hit++; pool.splice(i, 1); } else missed.push(e);
  }
  totalExpected += expected.length; totalHit += hit; totalExtra += pool.length;
  console.log(`Caught ${hit}/${expected.length}. Missed: ${missed.map(key).join("  ") || "none"}. Extra (check these): ${pool.map(key).join("  ") || "none"}`);
}

if (totalExpected > 0) {
  const recall = (100 * totalHit) / totalExpected;
  console.log(`\nOVERALL: caught ${totalHit}/${totalExpected} (${recall.toFixed(0)}%), ${totalExtra} extra flags. Target: ≥80% caught, few extras.`);
}
