"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";

export type AnswerSort = "top" | "new";

export function useCommunityAnswers(questionId: string, sort: AnswerSort) {
  return useInfiniteQuery({
    queryKey: qk.answers(questionId, sort),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => unwrap(api.questions[":id"].answers.$get({ param: { id: questionId }, query: { sort, cursor: pageParam } })),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
  });
}

type Page = Awaited<ReturnType<typeof fetchPage>>;
const fetchPage = (questionId: string) => unwrap(api.questions[":id"].answers.$get({ param: { id: questionId }, query: { sort: "top" } }));

/** Optimistic voting: counters and the viewer's vote update at once, and roll back on error. */
export function useVote(questionId: string, sort: AnswerSort) {
  const qc = useQueryClient();
  const key = qk.answers(questionId, sort);
  return useMutation({
    mutationFn: (v: { answerId: string; value: 1 | -1 | 0 }) =>
      unwrap(api.community.answers[":id"].vote.$put({ param: { id: v.answerId }, json: { value: v.value } })),
    onMutate: async ({ answerId, value }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<InfiniteData<Page>>(key);
      qc.setQueryData<InfiniteData<Page>>(key, (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.map((a) => {
              if (a.id !== answerId) return a;
              const old = a.myVote;
              return {
                ...a,
                myVote: value,
                upvotes: a.upvotes - (old === 1 ? 1 : 0) + (value === 1 ? 1 : 0),
                downvotes: a.downvotes - (old === -1 ? 1 : 0) + (value === -1 ? 1 : 0),
              };
            }),
          })),
        },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useReportAnswer(questionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { answerId: string; reason: "wrong" | "inappropriate" | "personal_info"; note?: string }) =>
      unwrap(api.community.answers[":id"].report.$post({ param: { id: v.answerId }, json: { reason: v.reason, note: v.note } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", questionId] }),
  });
}

export function usePublishedState(sourceId: string) {
  return useQuery({
    queryKey: ["community", "by-source", sourceId],
    queryFn: () => unwrap(api.community.answers["by-source"].$get({ query: { sourceId } })),
  });
}

function useAfterShareChange(sourceId: string, questionId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["community", "by-source", sourceId] });
    void qc.invalidateQueries({ queryKey: ["community", questionId] });
    // visibility shows in the submission/attempt itself and in history
    void qc.invalidateQueries({ queryKey: ["writing"] });
    void qc.invalidateQueries({ queryKey: ["practice"] });
    void qc.invalidateQueries({ queryKey: ["history"] });
  };
}

export function usePublishAnswer(sourceId: string, questionId: string) {
  const done = useAfterShareChange(sourceId, questionId);
  return useMutation({
    mutationFn: (json: { sourceType: "writing" | "attempt"; sourceId: string; includeScore: boolean; includeFeedback: boolean }) =>
      unwrap(api.community.answers.$post({ json })),
    onSuccess: done,
  });
}

export function useMakePrivate(sourceId: string, questionId: string) {
  const done = useAfterShareChange(sourceId, questionId);
  return useMutation({
    mutationFn: (answerId: string) => unwrap(api.community.answers[":id"].$patch({ param: { id: answerId }, json: { visibility: "private" } })),
    onSuccess: done,
  });
}
