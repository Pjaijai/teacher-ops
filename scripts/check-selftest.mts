/** Offline self-test for the answer/diagram checker and essay helpers (no API calls). Run: npm run test:checks */
import assert from "node:assert/strict";
import { checkQuestion } from "../src/lib/check";
import { locateFeedback, segmentText, stripMarkers } from "../src/lib/essay";
import type { GeneratedQuestion } from "../src/lib/questions";

const good: GeneratedQuestion = {
  stem: "In the figure, ∠B = 90°, AB = 5 cm and BC = 12 cm. Find AC.",
  marks: 2,
  diagram: {
    kind: "geometry",
    points: [
      { id: "A", x: 0, y: 5, showLabel: true, showDot: false },
      { id: "B", x: 0, y: 0, showLabel: true, showDot: false },
      { id: "C", x: 12, y: 0, showLabel: true, showDot: false },
    ],
    segments: [
      { from: "A", to: "B", label: "5 cm", dashed: false },
      { from: "B", to: "C", label: "12 cm", dashed: false },
      { from: "A", to: "C", label: "x", dashed: false },
    ],
    rightAngles: [{ vertex: "B", a: "A", b: "C" }],
    angles: [],
    axes: null,
    notToScale: false,
  },
  options: [],
  correctOption: null,
  distractorNotes: [],
  variables: [{ name: "AB", value: 5 }, { name: "BC", value: 12 }],
  answers: [{ part: "", expression: "sqrt(AB^2 + BC^2)", value: 13, display: "13 cm" }],
  solution: ["AC² = AB² + BC²", "AC = √(25 + 144) = 13 cm"],
};

assert.deepEqual(checkQuestion(good, "long"), [], "a correct question passes");

const wrongValue = { ...good, answers: [{ ...good.answers[0], value: 14, display: "14 cm" }] };
assert.ok(checkQuestion(wrongValue, "long").some((p) => p.includes("claimed 14")), "wrong arithmetic is caught");

const wrongDiagram = structuredClone(good);
wrongDiagram.diagram!.points[2].x = 10;
assert.ok(checkQuestion(wrongDiagram, "long").some((p) => p.includes("BC")), "figure that disagrees with its label is caught");

const notRight = structuredClone(good);
notRight.diagram!.points[0].x = 2;
assert.ok(checkQuestion(notRight, "long").some((p) => p.includes("right angle")), "fake right angle is caught");

const mc: GeneratedQuestion = {
  ...good,
  options: [
    { label: "A", text: "13 cm" }, { label: "B", text: "17 cm" },
    { label: "C", text: "√119 cm" }, { label: "D", text: "169 cm" },
  ],
  correctOption: "A",
};
assert.deepEqual(checkQuestion(mc, "mc"), [], "a correct MC question passes");
assert.ok(checkQuestion({ ...mc, correctOption: "B" }, "mc").some((p) => p.includes("does not match")), "wrong MC key is caught");

const trig: GeneratedQuestion = {
  ...good, diagram: null,
  variables: [{ name: "BC", value: 10 }, { name: "theta", value: 30 }],
  answers: [{ part: "", expression: "BC * tand(theta)", value: 5.773502691896, display: "5.77 cm" }],
};
assert.deepEqual(checkQuestion(trig, "long"), [], "degree trig helpers work");

// Essay helpers
const { clean, malformed } = stripMarkers("我[己?]經做完了功課，[武!]術很好。我己經很累。");
assert.equal(clean, "我己經做完了功課，武術很好。我己經很累。");
assert.deepEqual(malformed, [{ index: 9, char: "武" }]);

const items = locateFeedback(clean, {
  wrongCharacters: [
    { context: "我己經做完", wrong: "己", correct: "已", explanation: "" },
    { context: "我己經很累", wrong: "己", correct: "已", explanation: "" },
  ],
  goodSentences: [{ quote: "武術很好", reason: "" }],
  problemSentences: [{ quote: "not in text", issue: "", rewrite: "" }],
  overallComment: "",
}, malformed);
const wrongStarts = items.filter((i) => i.kind === "wrong").map((i) => i.start).sort((a, b) => a - b);
assert.deepEqual(wrongStarts, [1, 9, 15], "repeated mistakes each get their own position");
assert.equal(items.find((i) => i.kind === "problem")!.start, -1, "unfound quotes are kept but unplaced");
assert.equal(segmentText(clean, items).map((r) => r.text).join(""), clean, "segments cover the whole text");

console.log("All checker self-tests passed.");
