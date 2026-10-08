"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { qk } from "@/lib/query-keys";
import type { PracticeKind } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import { topicsFor } from "@/lib/topic-tree";
import { localNextQuestion, localPracticeQuestion, localSolveQuestion } from "./local-practice";

/** Separate from qk.question (the bank's GET /questions/:id) because the payload differs. */
export const practiceQuestionKey = (id: string) => ["practice", "question", id] as const;

type PracticeQuestion = Awaited<ReturnType<typeof cloudPracticeQuestion>>;
const cloudPracticeQuestion = (questionId: string) => unwrap(api.practice.questions[":id"].$get({ param: { id: questionId } }));

/**
 * The practice question view: question (public), my attempts, and the solution once attempted —
 * or straight away when `reveal` is on (the "Show answer" toggle).
 */
export function usePracticeQuestion(questionId: string, reveal = false) {
  return useQuery({
    queryKey: [...practiceQuestionKey(questionId), reveal ? "revealed" : "hidden"],
    queryFn: async () => {
      if (isLocalMode) return localPracticeQuestion(questionId, reveal) as Promise<PracticeQuestion>;
      const data = await cloudPracticeQuestion(questionId);
      if (!reveal || data.solution) return data;
      const solution = await unwrap(fetch(`/api/questions/${questionId}/solution?reveal=1`));
      return { ...data, solution } as PracticeQuestion;
    },
    retry: isLocalMode ? false : undefined,
  });
}

/** "Solve my question" (local mode): returns `{jobId}`; job.output = { questionId, note }. */
export function useSolveQuestion() {
  return useMutation({
    mutationFn: (body: { subject: "physics"; files: File[]; text: string; language?: "zh" | "en" }) => localSolveQuestion(body),
  });
}

export type TopicRow = {
  id: string;
  subject: Subject;
  parentId: string | null;
  kind: string;
  nameEn: string;
  nameZh: string;
  extension: boolean;
  foundation: string | null;
  /** Bundled topic tree only (local mode); the cloud API omits it and the picker falls back to the syllabus files. */
  strand?: string;
};

export function useTopics(subject: Subject) {
  return useQuery({
    queryKey: qk.topics(subject),
    queryFn: async () =>
      isLocalMode
        ? { items: topicsFor(subject) as TopicRow[] }
        : ((await unwrap(fetch(`/api/reference/topics?subject=${subject}`))) as { items: TopicRow[] }),
    staleTime: 60 * 60 * 1000,
  });
}

export type NextQuestionRequest = {
  subject: Subject;
  kind: PracticeKind;
  topicIds: string[];
  difficulty: number;
  extension: boolean;
  language: "zh" | "en";
  forceNew?: boolean;
};

/**
 * Cloud: serves an unseen bank question (free) or starts generating one (2 credits): `{questionId}` or `{jobId}`.
 * Local: there's no shared bank, so it always generates (`{jobId}`; the question is saved on this device).
 */
export function useNextQuestion() {
  return useMutation({
    mutationFn: (body: NextQuestionRequest) =>
      isLocalMode
        ? localNextQuestion(body)
        : (unwrap(
            fetch("/api/questions/next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
          ) as Promise<{ questionId?: string; jobId?: string }>),
  });
}
