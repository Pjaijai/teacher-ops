/**
 * Offline checks for the writing feature's pure logic (no AI, no database):
 * markers, 繁簡 script check, tracked edits, quote location, 錯別字 marks and caps.
 *
 *   npm run test:writing
 */
import assert from "node:assert/strict";
import { markerSegments, stripMarkers, textLength } from "../src/features/writing/lib/text-markers";
import { applyCaps, distinctWrongChars, gradePoints, levelFromTotal, wrongCharMarks } from "../src/server/services/writing/chinese-scoring-rules";
import { TextLocator } from "../src/server/services/writing/locate-feedback";
import { checkScript } from "../src/server/services/writing/script-check";
import { trackEdits } from "../src/server/services/writing/track-edits";

let passed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
};

test("stripMarkers: unsure, malformed, insertions", () => {
  const r = stripMarkers("我[已?]經{+很+}努力，[武!]功");
  assert.equal(r.clean, "我已經很努力，武功");
  assert.deepEqual(r.unsure, [{ start: 1, end: 2 }]);
  assert.deepEqual(r.insertions, [{ start: 3, end: 4 }]);
  assert.deepEqual(r.malformed, [{ index: 7, char: "武" }]);
});

test("stripMarkers: English multi-letter unsure word", () => {
  const r = stripMarkers("It is [necessary?] to {+go+} now.");
  assert.equal(r.clean, "It is necessary to go now.");
  assert.deepEqual(r.unsure, [{ start: 6, end: 15 }]);
});

test("markerSegments", () => {
  assert.deepEqual(markerSegments("a[b?]c{+d+}"), [
    { kind: "text", text: "a" },
    { kind: "unsure", text: "b" },
    { kind: "text", text: "c" },
    { kind: "insertion", text: "d" },
  ]);
});

test("textLength: Chinese counts punctuation, not spaces; English counts words", () => {
  assert.equal(textLength("你好，世界。\n\n再見", "chi_writing"), 8);
  assert.equal(textLength("I don't think it's well-known.", "eng_writing"), 5);
});

test("checkScript: traditional essay with a few simplified characters", () => {
  const r = checkScript("我們這個學校的老師說話很有趣，们这");
  assert.equal(r.dominant, "trad");
  assert.deepEqual(
    r.flags.map((f) => [f.char, f.suggestion]),
    [["们", "們"], ["这", "這"]],
  );
});

test("checkScript: simplified essay with a traditional character", () => {
  const r = checkScript("我们这个学校的老师说話很有趣");
  assert.equal(r.dominant, "simp");
  assert.deepEqual(r.flags.map((f) => [f.char, f.suggestion]), [["話", "话"]]);
});

test("checkScript: ambiguous characters (后/干/着/里) are never flagged", () => {
  const r = checkScript("皇后吃乾麵後，看着裏面的人。");
  assert.equal(r.flags.length, 0);
});

test("checkScript: one-to-many suggestion", () => {
  const r = checkScript("頭髮發現這個問題，发");
  assert.equal(r.flags[0].suggestion, "發／髮");
});

test("trackEdits: Chinese character change", () => {
  assert.deepEqual(trackEdits("我己經到了", "我已經到了"), [{ at: 1, before: "己", after: "已" }]);
});

test("trackEdits: insertion and deletion", () => {
  assert.deepEqual(trackEdits("今天天氣好", "今天天氣很好"), [{ at: 4, before: "", after: "很" }]);
  assert.deepEqual(trackEdits("今天天氣很好", "今天天氣好"), [{ at: 4, before: "很", after: "" }]);
});

test("trackEdits: English words, positions in edited text", () => {
  const edits = trackEdits("He go to school yesterday.", "He went to school yesterday.");
  assert.deepEqual(edits, [{ at: 3, before: "go", after: "went" }]);
});

test("trackEdits: identical texts and confirmed unsure markers give no edits", () => {
  assert.deepEqual(trackEdits(stripMarkers("我[已?]經").clean, stripMarkers("我已經").clean), []);
});

test("TextLocator: exact, normalised punctuation/space, prefix", () => {
  const text = "我認為，讀書不只是為了考試。\n\n讀書可以 開闊眼界！";
  const loc = new TextLocator(text);
  assert.deepEqual(loc.find("讀書不只是為了考試"), { start: 4, end: 13 });
  const s = loc.find("我認為,讀書"); // half-width comma
  assert.equal(text.slice(s!.start, s!.end), "我認為，讀書");
  const s2 = loc.find("讀書可以開闊眼界!"); // missing space, half-width !
  assert.equal(text.slice(s2!.start, s2!.end), "讀書可以 開闊眼界！");
  assert.equal(loc.find("完全不存在的句子"), null);
});

test("TextLocator: repeated wrong character gets each occurrence", () => {
  const loc = new TextLocator("我己經吃飯，他也己經吃飯。");
  const used = new Set<number>();
  const a = loc.findInContext("己經", "己", used)!;
  used.add(a.start);
  const b = loc.findInContext("己經", "己", used)!;
  assert.deepEqual([a.start, b.start], [1, 8]);
});

test("TextLocator: wrong char when context was paraphrased", () => {
  const loc = new TextLocator("我們再接再勵，一定成功。");
  const s = loc.findInContext("我們再接再勵!", "勵", new Set());
  assert.deepEqual(s, { start: 5, end: 6 });
});

test("錯別字 marks with 重錯不計", () => {
  const items = [
    { wrong: "己", correct: "已" },
    { wrong: "己", correct: "已" },
    { wrong: "勵", correct: "厲" },
  ];
  assert.equal(distinctWrongChars(items), 2);
  assert.deepEqual([0, 1, 2, 4, 5, 7, 8, 20].map(wrongCharMarks), [3, 3, 2, 2, 1, 1, 0, 0]);
});

test("caps: off-topic and short essays", () => {
  assert.deepEqual(applyCaps("content", "上上", true, 900), { grade: "下上", capped: "離題：內容最高下上" });
  assert.equal(applyCaps("expression", "上上", true, 900).grade, "中上");
  assert.equal(applyCaps("presentation", "上上", true, 900).grade, "上上");
  assert.equal(applyCaps("content", "上上", false, 500).grade, "中上");
  assert.equal(applyCaps("content", "上上", false, 350).grade, "中中(下)");
  assert.equal(applyCaps("content", "中下", false, 350).grade, "中下");
  assert.equal(applyCaps("content", "上上", false, 200).grade, "下上");
  assert.equal(gradePoints("極差劣"), 0);
});

test("levelFromTotal is monotonic", () => {
  let last = 0;
  for (let t = 0; t <= 103; t++) {
    const l = levelFromTotal(t);
    assert.ok(l >= last);
    last = l;
  }
  assert.equal(levelFromTotal(103), 5);
  assert.equal(levelFromTotal(0), 1);
});

console.log(`\n${passed} writing self-tests passed.`);
