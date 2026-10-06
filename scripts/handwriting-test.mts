/**
 * Day-one test: how well does the AI keep (and then catch) students' wrong characters?
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
import { askStructured, type ImageInput } from "../src/lib/ai";
import {
  ANALYZE_SYSTEM, AnalysisSchema, TRANSCRIBE_SYSTEM, TranscriptionSchema,
  countUncertain, locateFeedback, stripMarkers,
} from "../src/lib/essay";

try { process.loadEnvFile(".env.local"); } catch { /* rely on the environment */ }

const dir = process.argv[2] ?? "samples";
const mediaTypes: Record<string, ImageInput["mediaType"]> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
};

type Pair = { wrong: string; correct: string };
const key = (p: Pair) => `${p.wrong}→${p.correct}`;

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
  const transcription = await askStructured({
    name: "transcription", system: TRANSCRIBE_SYSTEM, images, schema: TranscriptionSchema,
    text: `Transcribe this essay (${images.length} pages, in order) exactly as written.`,
  });
  const { clean, malformed } = stripMarkers(transcription.text);
  const analysis = await askStructured({
    name: "essay_feedback", system: ANALYZE_SYSTEM, schema: AnalysisSchema,
    text: `${transcription.title ? `題目：${transcription.title}\n\n` : ""}學生作文：\n${clean}`,
  });
  const items = locateFeedback(clean, analysis, malformed);
  fs.writeFileSync(path.join(essayDir, "result.json"), JSON.stringify({ transcription, analysis, items }, null, 2));

  const found: Pair[] = items.flatMap((it) => (it.kind === "wrong" ? [{ wrong: it.malformed ? it.correct : it.wrong, correct: it.correct }] : []));
  console.log(`Uncertain characters flagged: ${countUncertain(transcription.text)}; malformed: ${malformed.length}`);
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
