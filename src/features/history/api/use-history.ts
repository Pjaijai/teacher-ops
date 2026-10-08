"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  listAttempts,
  listQuestions,
  listSubmissions,
} from "@/features/local/local-db";
import { api, unwrap } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";

export type HistoryItem = {
  id: string;
  type: "writing" | "practice";
  title: string;
  subject: string;
  status: string;
  level: number | null;
  score: number | null;
  maxScore: number | null;
  visibility?: "private" | "public";
  createdAt: string;
};

async function localHistory(
  type: "writing" | "practice",
): Promise<{ items: HistoryItem[]; nextCursor: string | null }> {
  const questions = new Map((await listQuestions()).map((q) => [q.id, q]));
  if (type === "writing") {
    const subs = await listSubmissions();
    return {
      nextCursor: null,
      items: subs.flatMap((s) => {
        const q = questions.get(s.questionId);
        return q
          ? [
              {
                id: s.id,
                type,
                title: q.title,
                subject: q.subject,
                status: s.status,
                level: s.estimate?.level ?? null,
                score: null,
                maxScore: null,
                createdAt: s.createdAt,
              },
            ]
          : [];
      }),
    };
  }
  const atts = await listAttempts();
  return {
    nextCursor: null,
    items: atts.flatMap((a) => {
      const q = questions.get(a.questionId);
      return q
        ? [
            {
              id: a.id,
              type,
              title: q.title,
              subject: q.subject,
              status: a.status,
              level: null,
              score: a.score,
              maxScore: a.maxScore,
              createdAt: a.createdAt,
            },
          ]
        : [];
    }),
  };
}

export function useHistory(type: "writing" | "practice") {
  return useInfiniteQuery({
    queryKey: ["history", type],
    initialPageParam: undefined as string | undefined,
    queryFn: ({
      pageParam,
    }): Promise<{ items: HistoryItem[]; nextCursor: string | null }> =>
      isLocalMode
        ? localHistory(type)
        : (unwrap(
            api.dashboard.history.$get({ query: { type, cursor: pageParam } }),
          ) as never),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
