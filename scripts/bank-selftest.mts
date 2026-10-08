/** Self-test for question bank search/serving, ratings, community rules and the learner profile (in-memory PGlite, no API calls). Run: npx tsx scripts/bank-selftest.mts */
process.env.PGLITE_DIR = ":memory:"; // the job runner's own getDb() must not touch real data
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import type { QuestionContent } from "../src/lib/schemas/question";
import { openPglite } from "../src/server/db/pglite";
import {
  attempts, creditLedger, criterionStats, errorTagStats, jobs, nextSteps, profiles, publicAnswers, questions, topicMastery, topics, users, writingSubmissions,
} from "../src/server/db/schema";
import { ApiError } from "../src/server/errors";
import { listAnswers } from "../src/server/services/community/list-answers";
import { checkPersonalInfo } from "../src/server/services/community/personal-info-check";
import { publishAnswer, updateAnswer } from "../src/server/services/community/publish-answer";
import { reportAnswer, voteAnswer } from "../src/server/services/community/vote-answer";
import { listHistory } from "../src/server/services/history/list-history";
import { getDashboard } from "../src/server/services/learner/dashboard";
import { recordAttemptResult, recordWritingResult } from "../src/server/services/learner/learner-events";
import { markViewed, saveQuestion } from "../src/server/services/questions/question-bank";
import { rateQuestion } from "../src/server/services/questions/ratings";
import { searchQuestions } from "../src/server/services/questions/search-questions";
import { nextQuestion } from "../src/server/services/questions/serve-question";

const db = await openPglite(":memory:");
let passed = 0;
const ok = (name: string) => console.log("  ok -", name, ++passed && "");
const rejects = async (fn: () => Promise<unknown>, status: number, code?: string) => {
  try {
    await fn();
  } catch (e) {
    assert.ok(e instanceof ApiError, `expected ApiError, got ${e}`);
    assert.equal(e.status, status);
    if (code) assert.equal(e.code, code);
    return e;
  }
  assert.fail("expected rejection");
};

const content = (stem: string, extra: Partial<QuestionContent> = {}): QuestionContent => ({
  stem, materials: null, figure: null, graph: null, options: [], correctOption: null, distractorNotes: [], variables: [], answers: [],
  markingScheme: [], solution: [], taskAnalysis: "", tips: [], writing: null, ...extra,
});

for (const [id, name, nick] of [["u1", "Alice", "alice"], ["u2", "Bob", "bobby"], ["u3", "Cy", null], ["u4", "Di", "dee"], ["u5", "Ed", "eddie"]] as const) {
  await db.insert(users).values({ id, name, email: `${id}@x.test` });
  await db.insert(profiles).values({ userId: id, displayName: name, nickname: nick, examLanguage: "en" });
}
await db.insert(topics).values([
  { id: "CP-7", subject: "math_cp", kind: "unit", nameEn: "Quadratic", nameZh: "二次", sortOrder: 1 },
  { id: "CP-8", subject: "math_cp", kind: "unit", nameEn: "Functions", nameZh: "函數", sortOrder: 2 },
]);

const base = { checkProblems: [] as string[], language: "en" as const };
const q1 = await saveQuestion(db, { ...base, subject: "math_cp", kind: "short", title: "Quadratic equation roots", topicIds: ["CP-7"], difficulty: 3, content: content("Solve $x^2-5x+6=0$.") });
const q2 = await saveQuestion(db, { ...base, subject: "math_cp", kind: "short", title: "Function transformation", topicIds: ["CP-8"], difficulty: 5, content: content("Describe the graph shift.") });
const q3 = await saveQuestion(db, { ...base, language: "zh", subject: "chi_writing", kind: "writing_task", title: "我的夢想", topicIds: ["CHI-B-narrative"], part: "乙部", content: content("以「我的夢想」為題寫一篇文章。") });
const qPriv = await saveQuestion(db, { ...base, subject: "math_cp", kind: "short", title: "Private quadratic", topicIds: ["CP-7"], ownerId: "u1", content: content("secret quadratic") });
const qChecking = await saveQuestion(db, { ...base, subject: "math_cp", kind: "short", title: "Quadratic unchecked", topicIds: ["CP-7"], checkProblems: ["bad"], content: content("x") });
void q2;

console.log("search");
let r = await searchQuestions(db, "u1", {});
assert.equal(r.items.length, 3);
assert.ok(!r.items.some((i) => i.id === qPriv || i.id === qChecking));
ok("only active public questions");
r = await searchQuestions(db, "u1", { q: "quadratic" });
assert.deepEqual(r.items.map((i) => i.id), [q1]);
assert.equal(r.semantic, false);
ok("keyword search falls back to text match when embedding fails");
r = await searchQuestions(db, "u1", { q: "夢想" });
assert.deepEqual(r.items.map((i) => i.id), [q3]);
ok("Chinese keyword via ILIKE");
r = await searchQuestions(db, "u1", { topic: ["CP-7", "CP-8"], subject: "math_cp" });
assert.equal(r.items.length, 2);
r = await searchQuestions(db, "u1", { difficulty: 5 });
assert.equal(r.items.length, 1);
r = await searchQuestions(db, "u1", { language: "zh", kind: "writing_task" });
assert.equal(r.items.length, 1);
ok("topic / difficulty / language / kind filters");
await markViewed(db, "u1", q1, { attempted: true });
r = await searchQuestions(db, "u1", { subject: "math_cp", unattempted: "true" });
assert.ok(!r.items.some((i) => i.id === q1));
r = await searchQuestions(db, "u1", { subject: "math_cp" });
assert.equal(r.items.find((i) => i.id === q1)?.attempted, true);
ok("attempted flag and unattempted filter");

console.log("next");
const n1 = await nextQuestion(db, "u2", { subject: "math_cp", topicIds: ["CP-7"], kind: "short", difficulty: 3, extension: false, forceNew: false });
assert.equal(n1.questionId, q1);
const bal = async (u: string) => (await db.select().from(creditLedger).where(eq(creditLedger.userId, u))).reduce((s, x) => s + x.delta, 0);
assert.equal(await bal("u2"), 0);
ok("serves an unseen bank question for free");
const n2 = await nextQuestion(db, "u2", { subject: "math_cp", topicIds: ["CP-7"], kind: "short", difficulty: 3, extension: false, forceNew: false });
assert.ok(n2.jobId);
assert.equal(await bal("u2"), -2);
const [job] = await db.select().from(jobs).where(eq(jobs.id, n2.jobId!));
assert.equal(job.kind, "generate_question");
assert.equal((job.input as { language: string }).language, "en");
ok("seen everything -> charges 2 credits and starts a generate_question job");
const n3 = await nextQuestion(db, "u4", { subject: "math_cp", topicIds: ["CP-7"], kind: "short", difficulty: 3, extension: false, forceNew: true });
assert.ok(n3.jobId);
ok("forceNew skips the bank");

console.log("ratings");
let rt = await rateQuestion(db, "u1", q1, { value: 1 });
assert.equal(rt.up, 1);
rt = await rateQuestion(db, "u2", q1, { value: -1 });
assert.deepEqual([rt.up, rt.down], [1, 1]);
rt = await rateQuestion(db, "u2", q1, { value: 0 });
assert.deepEqual([rt.up, rt.down], [1, 0]);
ok("thumbs up/down/clear keep counters");
await rateQuestion(db, "u2", q1, { report: "wrong" });
await rateQuestion(db, "u3", q1, { report: "wrong" });
rt = await rateQuestion(db, "u4", q1, { report: "wrong" });
assert.equal(rt.status, "reported");
assert.equal(rt.reportCount, 3);
r = await searchQuestions(db, "u5", { subject: "math_cp" });
assert.ok(!r.items.some((i) => i.id === q1));
ok("3 reports -> status reported, hidden from search");

console.log("personal info");
assert.deepEqual(checkPersonalInfo("Call me on 9123 4567 or mail a.b@c.com").map((f) => f.kind).sort(), ["email", "phone"]);
assert.ok(checkPersonalInfo("+852 6123-4567").some((f) => f.kind === "phone"));
assert.ok(checkPersonalInfo("ID A123456(7)").some((f) => f.kind === "hkid"));
assert.ok(checkPersonalInfo("我就讀於聖保羅男女中學").some((f) => f.kind === "school"));
assert.ok(checkPersonalInfo("I study at St Paul College").some((f) => f.kind === "school"));
assert.equal(checkPersonalInfo("我們學校的老師很好。The answer is 1234 and x=5.").length, 0);
ok("phone / email / HKID / school detection, no false alarm on plain text");

console.log("community");
const [sub] = await db.insert(writingSubmissions).values({ userId: "u1", questionId: q3, status: "graded", inputMode: "typed", editedText: "我的夢想是成為老師。" }).returning();
const [att] = await db.insert(attempts).values({ userId: "u1", questionId: q2, status: "marked", editedTranscript: [{ latex: "x=2" }, { latex: "y=3" }], score: "3", maxScore: "4" }).returning();
const [privSub] = await db.insert(writingSubmissions).values({ userId: "u1", questionId: qPriv, status: "graded", inputMode: "typed", editedText: "hello" }).returning();
const [subU3] = await db.insert(writingSubmissions).values({ userId: "u3", questionId: q3, status: "graded", inputMode: "typed", editedText: "text" }).returning();

await rejects(() => publishAnswer(db, "u3", { sourceType: "writing", sourceId: subU3.id, includeScore: false, includeFeedback: false }), 409, "conflict");
ok("nickname required (409)");
await rejects(() => publishAnswer(db, "u2", { sourceType: "writing", sourceId: sub.id, includeScore: false, includeFeedback: false }), 404);
ok("cannot publish someone else's source");
await rejects(() => publishAnswer(db, "u1", { sourceType: "writing", sourceId: privSub.id, includeScore: false, includeFeedback: false }), 403, "forbidden");
ok("private question answers can't be public");
await db.update(writingSubmissions).set({ editedText: "請打 91234567 找我" }).where(eq(writingSubmissions.id, sub.id));
const piErr = await rejects(() => publishAnswer(db, "u1", { sourceType: "writing", sourceId: sub.id, includeScore: false, includeFeedback: false }), 400, "validation");
assert.ok(Array.isArray((piErr as ApiError).extra.found));
ok("personal info blocks publishing (400)");
await db.update(writingSubmissions).set({ editedText: "我的夢想是成為老師。" }).where(eq(writingSubmissions.id, sub.id));
const pub = await publishAnswer(db, "u1", { sourceType: "writing", sourceId: sub.id, includeScore: true, includeFeedback: true });
assert.equal(pub.status, "published");
assert.equal((await db.select().from(writingSubmissions).where(eq(writingSubmissions.id, sub.id)))[0].visibility, "public");
const pub2 = await publishAnswer(db, "u1", { sourceType: "writing", sourceId: sub.id, includeScore: false, includeFeedback: false });
assert.equal(pub2.id, pub.id);
ok("publish snapshots + upserts by source, source becomes public");
const pubAtt = await publishAnswer(db, "u1", { sourceType: "attempt", sourceId: att.id, includeScore: true, includeFeedback: false });
assert.equal((await db.select().from(publicAnswers).where(eq(publicAnswers.id, pubAtt.id)))[0].body, "$$x=2$$\n\n$$y=3$$");
ok("attempt body is LaTeX lines");

await rejects(() => listAnswers(db, "u2", q3, { sort: "top" }), 403, "forbidden");
ok("answers locked until viewer has own answer");
await db.insert(writingSubmissions).values({ userId: "u2", questionId: q3, status: "review", inputMode: "typed", editedText: "mine" });
let la = await listAnswers(db, "u2", q3, { sort: "top" });
assert.equal(la.items.length, 1);
assert.equal(la.items[0].nickname, "alice");
assert.ok(!JSON.stringify(la.items[0]).includes("u1"));
ok("unlocked after own submission, nickname only");

await rejects(() => voteAnswer(db, "u1", pub.id, 1), 403);
let v = await voteAnswer(db, "u2", pub.id, 1);
assert.deepEqual([v.upvotes, v.downvotes], [1, 0]);
v = await voteAnswer(db, "u2", pub.id, -1);
assert.deepEqual([v.upvotes, v.downvotes], [0, 1]);
la = await listAnswers(db, "u2", q3, { sort: "top" });
assert.equal(la.items[0].myVote, -1);
v = await voteAnswer(db, "u2", pub.id, 0);
assert.deepEqual([v.upvotes, v.downvotes], [0, 0]);
ok("voting: own rejected, change, remove, myVote");

await reportAnswer(db, "u2", pub.id, { reason: "wrong" });
await rejects(() => reportAnswer(db, "u2", pub.id, { reason: "wrong" }), 409);
await reportAnswer(db, "u3", pub.id, { reason: "inappropriate" });
const rep = await reportAnswer(db, "u4", pub.id, { reason: "personal_info" });
assert.equal(rep.hidden, true);
assert.equal((await db.select().from(publicAnswers).where(eq(publicAnswers.id, pub.id)))[0].status, "hidden_reported");
la = await listAnswers(db, "u2", q3, { sort: "new" });
assert.equal(la.items.length, 0);
await rejects(() => updateAnswer(db, "u1", pub.id, { republish: true }), 403);
ok("3 reports hide the answer; once per reporter; can't republish");

const hid = await updateAnswer(db, "u1", pubAtt.id, { visibility: "private" });
assert.equal(hid.status, "hidden_by_owner");
assert.equal((await db.select().from(attempts).where(eq(attempts.id, att.id)))[0].visibility, "private");
const re = await updateAnswer(db, "u1", pubAtt.id, { republish: true });
assert.equal(re.status, "published");
ok("make private / republish");

console.log("learner profile");
const wr = (scores: Record<string, number>, tags: string[]) =>
  recordWritingResult(db, { userId: "u1", subject: "chi_writing", part: "B", submissionId: sub.id, questionId: q3, criterionScores: scores, errorTags: tags });
await wr({ content: 0.8, language: 0.4 }, ["zh.char.己/已", "zh.char.己/已", "zh.sentence"]);
let cs = await db.select().from(criterionStats).where(eq(criterionStats.userId, "u1"));
assert.equal(Number(cs.find((c) => c.criterion === "content")!.ewma), 0.8);
await wr({ content: 0.4, language: 0.6 }, ["zh.sentence"]);
cs = await db.select().from(criterionStats).where(eq(criterionStats.userId, "u1"));
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
near(Number(cs.find((c) => c.criterion === "content")!.ewma), 0.35 * 0.4 + 0.65 * 0.8);
near(Number(cs.find((c) => c.criterion === "language")!.ewma), 0.35 * 0.6 + 0.65 * 0.4);
assert.equal(cs.find((c) => c.criterion === "content")!.attempts, 2);
ok("criterion EWMA alpha 0.35");
const tg = await db.select().from(errorTagStats).where(eq(errorTagStats.userId, "u1"));
near(Number(tg.find((t) => t.tag === "zh.char.己/已")!.weighted), 2 * 0.8);
near(Number(tg.find((t) => t.tag === "zh.sentence")!.weighted), 1 * 0.8 + 1);
assert.equal(tg.find((t) => t.tag === "zh.sentence")!.total, 2);
ok("error tags decay x0.8 and count");
let steps = await db.select().from(nextSteps).where(eq(nextSteps.userId, "u1"));
assert.ok(steps.some((s) => s.kind === "revise") && steps.some((s) => s.kind === "helper"));
ok("writing next steps (revise + helper)");

const at = (f: number) =>
  recordAttemptResult(db, { userId: "u1", subject: "math_cp", attemptId: att.id, questionId: q1, topicIds: ["CP-7"], fraction: f, errorTags: ["sign-error"] });
await at(1);
await at(0.5);
await at(0.25);
const tm = (await db.select().from(topicMastery).where(eq(topicMastery.userId, "u1")))[0];
near(Number(tm.ewma), 0.35 * 0.25 + 0.65 * (0.35 * 0.5 + 0.65 * 1));
assert.equal(tm.attempts, 3);
steps = await db.select().from(nextSteps).where(eq(nextSteps.userId, "u1"));
assert.ok(steps.some((s) => s.kind === "topic" && (s.target as { topicId: string }).topicId === "CP-7"));
ok("topic mastery EWMA + topic next step");

const dash = await getDashboard(db, "u1", "math_cp");
assert.equal(dash.topicMastery[0].nameEn, "Quadratic");
assert.ok(dash.nextSteps.length >= 1 && dash.recent.length >= 1);
const dashW = await getDashboard(db, "u1", "chi_writing");
assert.equal(dashW.criterionStats.length, 2);
ok("dashboard payload");
const h = await listHistory(db, "u1", {});
assert.ok(h.items.length >= 3);
assert.equal((await listHistory(db, "u1", { type: "practice" })).items.every((i) => i.type === "practice"), true);
ok("history");
void questions;
console.log(`\nAll ${passed} checks passed.`);
process.exit(0);
