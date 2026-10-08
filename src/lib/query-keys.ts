/** Every TanStack Query key in one place, so mutations know what to invalidate. */
export const qk = {
  me: ["me"] as const,
  creditHistory: ["me", "credits"] as const,
  topics: (subject?: string) => ["topics", subject ?? "all"] as const,
  bank: (filters: Record<string, unknown>) => ["bank", filters] as const,
  question: (id: string) => ["question", id] as const,
  solution: (id: string) => ["question", id, "solution"] as const,
  helper: (questionId: string, kind: string) => ["writing", "helper", questionId, kind] as const,
  submission: (id: string) => ["writing", "submission", id] as const,
  submissions: ["writing", "submissions"] as const,
  attempt: (id: string) => ["practice", "attempt", id] as const,
  attempts: ["practice", "attempts"] as const,
  answers: (questionId: string, sort: string) => ["community", questionId, sort] as const,
  dashboard: (subject: string) => ["dashboard", subject] as const,
  job: (id: string) => ["job", id] as const,
};
