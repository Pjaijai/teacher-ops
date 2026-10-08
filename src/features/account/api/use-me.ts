"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { api, unwrap, type Ok } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { qk } from "@/lib/query-keys";
import { clearAllData } from "@/features/local/backup";
import { getProfile, saveProfile } from "@/features/local/local-db";

type Me = Ok<Awaited<ReturnType<typeof api.me.$get>>>;

/** Local mode: the "user" is this device; the profile lives in IndexedDB and there are no credits. */
async function localMe(): Promise<Me> {
  const p = await getProfile();
  const now = new Date().toISOString();
  return {
    user: { id: "local", email: "", name: p.displayName },
    profile: {
      userId: "local",
      displayName: p.displayName,
      nickname: null,
      form: p.form,
      subjects: p.subjects,
      examLanguage: p.examLanguage,
      uiLocale: "zh-HK",
      extensionTrack: p.extensionTrack,
      onboarded: p.onboarded,
      createdAt: now,
      updatedAt: now,
    },
    credits: null,
  } as unknown as Me;
}

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: () => (isLocalMode ? localMe() : unwrap(api.me.$get())) });
}

/** Credits balance (cloud mode only; null in local mode). */
export function useCredits() {
  const me = useMe();
  return me.data?.credits ?? null;
}

type ProfilePatch = InferRequestType<typeof api.me.profile.$patch>["json"];

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: ProfilePatch) => {
      if (!isLocalMode) return unwrap(api.me.profile.$patch({ json }));
      const { nickname: _n, uiLocale: _u, ...rest } = json;
      return saveProfile(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }),
  });
}

export function useCreditHistory() {
  return useQuery({
    queryKey: qk.creditHistory,
    queryFn: () => unwrap(api.me.credits.history.$get()),
    enabled: !isLocalMode,
  });
}

/** Cloud: delete the account. Local: delete everything stored on this device. */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (isLocalMode) await clearAllData();
      else await unwrap(api.me.$delete({ json: { confirm: "DELETE" } }));
    },
    onSuccess: () => qc.clear(),
  });
}

/** Call after any action that spends credits so the badge updates. */
export function useRefreshCredits() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.me });
}
