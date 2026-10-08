export const SUBJECTS = ["chi_writing", "eng_writing", "math_cp", "math_m1", "math_m2", "physics"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const WRITING_SUBJECTS = ["chi_writing", "eng_writing"] as const satisfies readonly Subject[];
export const PRACTICE_SUBJECTS = ["math_cp", "math_m1", "math_m2", "physics"] as const satisfies readonly Subject[];

/** Subjects available in the app (v1 writing + Maths CP, v2 M1/M2, v3 Physics). */
export const ENABLED_SUBJECTS: readonly Subject[] = ["chi_writing", "eng_writing", "math_cp", "math_m1", "math_m2", "physics"];

export const isWritingSubject = (s: Subject) => (WRITING_SUBJECTS as readonly Subject[]).includes(s);

export const SUBJECT_NAMES: Record<Subject, { en: string; zh: string }> = {
  chi_writing: { en: "Chinese writing", zh: "中文寫作" },
  eng_writing: { en: "English writing", zh: "英文寫作" },
  math_cp: { en: "Maths (Compulsory)", zh: "數學（必修部分）" },
  math_m1: { en: "M1 Calculus & Statistics", zh: "M1 微積分與統計" },
  math_m2: { en: "M2 Algebra & Calculus", zh: "M2 代數與微積分" },
  physics: { en: "Physics", zh: "物理" },
};
