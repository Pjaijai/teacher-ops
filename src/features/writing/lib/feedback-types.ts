/** Payload shapes of writing_feedback rows (see server/services/writing/*-feedback.ts). */
export type TaskRecapPayload = {
  verdict: "met" | "partly" | "not_met";
  summary: string;
  points: { requirement: string; met: boolean; comment: string }[];
};
export type StrengthPayload = { point: string; quote: string | null };
export type WrongCharPayload = { wrong: string; correct: string; explanation: string; malformed: boolean; context?: string };
export type MixedScriptPayload = { char: string; suggestion: string; dominant: "trad" | "simp" | null };
export type ProblemPayload = { quote: string; type: string; issue: string; rewrite: string };
export type GoodPayload = { quote: string; reason: string };
export type EngErrorPayload = { quote: string; tag: string; correction: string; explanation: string };
export type VocabPayload = { quote: string; original: string; upgrades: string[]; note: string };
export type StructurePayload = { quote: string; rewrite: string; note: string };
export type OverallPayload = { comment: string; nextSteps: string[] };
