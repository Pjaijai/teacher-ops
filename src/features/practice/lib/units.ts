import cpUnits from "../../../../syllabus/math-compulsory.json";
import m1Units from "../../../../syllabus/m1.json";
import m2Units from "../../../../syllabus/m2.json";
import type { PracticeKind } from "@/lib/schemas/practice";
import { PRACTICE_SUBJECTS, type Subject } from "@/lib/subjects";

/** Strand of each maths Learning Unit (the cloud topics API returns names only; strands come from the syllabus files). */
const STRAND_OF = new Map<string, string>(
  [...cpUnits, ...m1Units, ...m2Units].map((u) => [(u as { id: string }).id, (u as { strand: string }).strand]),
);

export function strandOf(unitId: string): string | null {
  return STRAND_OF.get(unitId) ?? null;
}

/** Message keys for known strand names (others are shown as they are, e.g. Physics topic names). */
export const STRAND_KEYS: Record<string, string> = {
  "Number and Algebra": "numberAlgebra",
  "Measures, Shape and Space": "measures",
  "Data Handling": "data",
  "Further Learning Unit": "further",
  "Foundation Knowledge": "foundationKnowledge",
  Calculus: "calculus",
  Statistics: "statistics",
  Algebra: "algebra",
};

/** Units students don't practise: the "Inquiry and investigation" Further Learning Units have no exam questions. */
const NOT_PRACTISED = new Set(["CP-20", "M1-21", "M2-18"]);
export const PRACTISABLE = (id: string) => !NOT_PRACTISED.has(id);

/** Question types offered per subject. */
export function kindsFor(subject: Subject): PracticeKind[] {
  return subject === "physics" ? ["mc", "short", "long", "experiment"] : ["mc", "short", "long"];
}

/** Whether the subject has an extension / non-foundation toggle (CP: non-foundation topics; Physics: `*` content). */
export const hasExtension = (subject: Subject) => subject === "math_cp" || subject === "physics";

export const isPracticeSubject = (s: string): s is (typeof PRACTICE_SUBJECTS)[number] => (PRACTICE_SUBJECTS as readonly string[]).includes(s);
