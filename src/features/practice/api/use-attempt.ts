"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, uploadImages, type Ok } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { qk } from "@/lib/query-keys";
import {
  localAnswerMc,
  localAttemptDetail,
  localCreateAttempt,
  localDispute,
  localListAttempts,
  localSaveTranscript,
  localStartMarking,
  localSubmitPages,
} from "./local-practice";
import { practiceQuestionKey } from "./use-practice-question";

type AttemptRes = ReturnType<(typeof api.practice.attempts)[":id"]["$get"]>;
export type AttemptDetail = Ok<Awaited<AttemptRes>>;
type AttemptList = Ok<Awaited<ReturnType<typeof api.practice.attempts.$get>>>;
export type AttemptListItem = AttemptList["items"][number];
export type McResponse = Ok<Awaited<ReturnType<(typeof api.practice.attempts)[":id"]["mc"]["$post"]>>>;

/** Local mode keeps everything in IndexedDB (local-practice.ts); cloud mode calls the API. */

export function useAttempt(id: string | null, opts: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: qk.attempt(id ?? "none"),
    queryFn: () =>
      isLocalMode
        ? (localAttemptDetail(id!) as Promise<AttemptDetail>)
        : unwrap(api.practice.attempts[":id"].$get({ param: { id: id! } })),
    enabled: Boolean(id),
    refetchInterval: opts.poll ? 3000 : false,
    retry: isLocalMode ? false : undefined,
  });
}

export function useAttempts(questionId?: string, limit = 10) {
  return useQuery({
    queryKey: [...qk.attempts, questionId ?? "all", limit],
    queryFn: () =>
      isLocalMode
        ? (localListAttempts(questionId, limit) as Promise<AttemptList>)
        : unwrap(api.practice.attempts.$get({ query: { ...(questionId ? { questionId } : {}), limit: String(limit) } })),
  });
}

/** Refresh everything that shows an attempt (after a local job saves its result). */
function useInvalidateAttempt() {
  const qc = useQueryClient();
  return (attemptId: string, questionId?: string) => {
    void qc.invalidateQueries({ queryKey: qk.attempt(attemptId) });
    void qc.invalidateQueries({ queryKey: qk.attempts });
    void qc.invalidateQueries({ queryKey: ["practice", "question"] });
    if (questionId) void qc.invalidateQueries({ queryKey: practiceQuestionKey(questionId) });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useCreateAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      isLocalMode ? localCreateAttempt(questionId) : unwrap(api.practice.attempts.$post({ json: { questionId } })),
    onSuccess: (_d, questionId) => {
      void qc.invalidateQueries({ queryKey: qk.attempts });
      void qc.invalidateQueries({ queryKey: practiceQuestionKey(questionId) });
    },
  });
}

export function useAnswerMc(questionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, choice }: { attemptId: string; choice: "A" | "B" | "C" | "D" }): Promise<McResponse> =>
      isLocalMode
        ? (localAnswerMc(attemptId, choice) as Promise<McResponse>)
        : unwrap(api.practice.attempts[":id"].mc.$post({ param: { id: attemptId }, json: { choice } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: practiceQuestionKey(questionId) });
      void qc.invalidateQueries({ queryKey: qk.attempts });
      if (isLocalMode) void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Upload photos, then start transcription (cloud: 3 credits per page; local: photos stay on this device). */
export function useUploadPages() {
  const invalidate = useInvalidateAttempt();
  return useMutation({
    mutationFn: async ({ attemptId, files }: { attemptId: string; files: File[] }) => {
      if (isLocalMode) return localSubmitPages(attemptId, files, () => invalidate(attemptId));
      const uploadKeys = await uploadImages(files);
      return unwrap(api.practice.attempts[":id"].pages.$post({ param: { id: attemptId }, json: { uploadKeys } }));
    },
    onSuccess: (_d, { attemptId }) => {
      if (isLocalMode) invalidate(attemptId);
    },
  });
}

export function useSaveTranscript(attemptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lines: { latex: string }[]) =>
      isLocalMode
        ? localSaveTranscript(attemptId, lines)
        : unwrap(api.practice.attempts[":id"].transcript.$patch({ param: { id: attemptId }, json: { lines } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.attempt(attemptId) }),
  });
}

export function useMark(attemptId: string) {
  const invalidate = useInvalidateAttempt();
  return useMutation({
    mutationFn: () =>
      isLocalMode
        ? localStartMarking(attemptId, () => invalidate(attemptId))
        : unwrap(api.practice.attempts[":id"].mark.$post({ param: { id: attemptId } })),
    onSuccess: () => {
      if (isLocalMode) invalidate(attemptId);
    },
  });
}

export function useDispute(attemptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { part: string; markIndex?: number | null; reason: string }) =>
      isLocalMode
        ? localDispute(attemptId, body)
        : unwrap(api.practice.attempts[":id"].disputes.$post({ param: { id: attemptId }, json: body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.attempt(attemptId) }),
  });
}
