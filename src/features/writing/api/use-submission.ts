"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Ok } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { qk } from "@/lib/query-keys";
import * as local from "../lib/local-writing";

type SubmissionRes = Awaited<ReturnType<(typeof api.writing.submissions)[":id"]["$get"]>>;
export type SubmissionView = Ok<SubmissionRes>;
export type FeedbackItem = SubmissionView["feedback"][number];
export type LevelSampleView = SubmissionView["samples"][number];

type ListRes = Awaited<ReturnType<typeof api.writing.submissions.$get>>;
type SubmissionList = Ok<ListRes>;

/** Local mode: refresh every writing view once an in-tab job has saved its result. */
function useRefreshWriting() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["writing"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: qk.submission(id),
    queryFn: async (): Promise<SubmissionView> =>
      isLocalMode ? ((await local.getSubmissionView(id)) as unknown as SubmissionView) : unwrap(api.writing.submissions[":id"].$get({ param: { id } })),
  });
}

export function useSubmissions(questionId?: string) {
  return useQuery({
    queryKey: [...qk.submissions, questionId ?? "all"],
    queryFn: async (): Promise<SubmissionList> =>
      isLocalMode
        ? ((await local.listSubmissionRows(questionId)) as unknown as SubmissionList)
        : unwrap(api.writing.submissions.$get({ query: questionId ? { questionId } : {} })),
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  const refresh = useRefreshWriting();
  return useMutation({
    /** Cloud: photos go up first as `uploadKeys`. Local: pass the picked `files`; they're kept on this device. */
    mutationFn: async ({
      files,
      ...json
    }: {
      questionId: string;
      inputMode: "typed" | "photo";
      text?: string;
      uploadKeys?: string[];
      files?: Blob[];
      parentSubmissionId?: string;
    }): Promise<{ submissionId: string; jobId: string | null }> =>
      isLocalMode ? local.createSubmission({ ...json, files }, refresh) : unwrap(api.writing.submissions.$post({ json })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.submissions });
      void qc.invalidateQueries({ queryKey: ["writing", "task"] });
      if (!isLocalMode) void qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

export function useSaveText(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (editedText: string) =>
      isLocalMode ? local.updateText(id, editedText) : unwrap(api.writing.submissions[":id"].text.$patch({ param: { id }, json: { editedText } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.submission(id) }),
  });
}

export function useSubmitForFeedback(id: string) {
  const qc = useQueryClient();
  const refresh = useRefreshWriting();
  return useMutation({
    mutationFn: async (wantsEstimate: boolean) =>
      isLocalMode ? local.submitForFeedback(id, wantsEstimate, refresh) : unwrap(api.writing.submissions[":id"].submit.$post({ param: { id }, json: { wantsEstimate } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.submission(id) });
      void qc.invalidateQueries({ queryKey: qk.submissions });
      if (!isLocalMode) void qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

export function useRetryTranscription(id: string) {
  const qc = useQueryClient();
  const refresh = useRefreshWriting();
  return useMutation({
    mutationFn: async () => (isLocalMode ? local.retryTranscription(id, refresh) : unwrap(api.writing.submissions[":id"].transcribe.$post({ param: { id } }))),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.submission(id) });
      if (!isLocalMode) void qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}

export function useRequestSample(id: string) {
  const qc = useQueryClient();
  const refresh = useRefreshWriting();
  return useMutation({
    mutationFn: async (targetLevel?: number) =>
      isLocalMode ? local.requestSample(id, targetLevel, refresh) : unwrap(api.writing.submissions[":id"].sample.$post({ param: { id }, json: { targetLevel } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.submission(id) });
      if (!isLocalMode) void qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}
