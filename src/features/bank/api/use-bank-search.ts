"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listAttempts,
  listQuestions,
  listSubmissions,
  updateQuestion,
} from "@/features/local/local-db";
import { api, unwrap } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { qk } from "@/lib/query-keys";
import type { Subject } from "@/lib/subjects";
import { topicsFor } from "@/lib/topic-tree";

export type BankFilters = {
  q?: string;
  subject?: string;
  topic: string[];
  kind?: string;
  difficulty?: string;
  extension?: string;
  language?: string;
  unattempted?: string;
  sort?: string;
};

export const FILTER_KEYS = [
  "q",
  "subject",
  "kind",
  "difficulty",
  "extension",
  "language",
  "unattempted",
  "sort",
] as const;

export function filtersFromParams(p: URLSearchParams): BankFilters {
  const f: BankFilters = { topic: p.getAll("topic") };
  for (const k of FILTER_KEYS) {
    const v = p.get(k);
    if (v) f[k] = v;
  }
  return f;
}

export function filtersToParams(f: BankFilters): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k]) p.set(k, f[k]!);
  for (const t of f.topic) p.append("topic", t);
  return p;
}

/** Local mode: filter the questions generated on this device. Keyword = case-insensitive substring. */
async function searchLocal(f: BankFilters) {
  const [questions, subs, atts] = await Promise.all([
    listQuestions(),
    listSubmissions(),
    listAttempts(),
  ]);
  const attempted = new Set([
    ...subs.map((s) => s.questionId),
    ...atts.map((a) => a.questionId),
  ]);
  const needle = f.q?.trim().toLowerCase();
  let rows = questions.filter((q) => {
    if (f.subject && q.subject !== f.subject) return false;
    if (f.kind && q.kind !== f.kind) return false;
    if (f.difficulty && q.difficulty !== Number(f.difficulty)) return false;
    if (f.extension && q.extension !== (f.extension === "true")) return false;
    if (f.language && q.language !== f.language) return false;
    if (f.topic.length && !q.topicIds.some((id) => f.topic.includes(id)))
      return false;
    if (f.unattempted === "true" && attempted.has(q.id)) return false;
    if (needle) {
      const hay =
        `${q.title}\n${q.content.stem}\n${q.content.materials ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  if (f.sort === "rating")
    rows = [...rows].sort(
      (a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt),
    );
  const items = rows.map((q) => ({
    id: q.id,
    subject: q.subject as Subject,
    kind: q.kind,
    title: q.title,
    language: q.language,
    topicIds: q.topicIds,
    part: q.part,
    difficulty: q.difficulty,
    extension: q.extension,
    rating: { up: q.rating === 1 ? 1 : 0, down: q.rating === -1 ? 1 : 0 },
    localRating: q.rating,
    attempted: attempted.has(q.id),
    content: q.content,
  }));
  return { items, nextCursor: null as string | null };
}

export function useBankSearch(filters: BankFilters) {
  return useInfiniteQuery({
    queryKey: qk.bank(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({
      pageParam,
    }): Promise<{ items: BankItem[]; nextCursor: string | null }> =>
      isLocalMode
        ? searchLocal(filters)
        : (unwrap(
            api.questions.search.$get({
              query: {
                ...filters,
                topic: filters.topic,
                cursor: pageParam,
              } as never,
            }),
          ) as never),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export type BankItem = Awaited<ReturnType<typeof searchLocal>>["items"][number];

/** Local mode: thumbs up/down on one of your own questions (click again to clear). */
export function useRateLocalQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: 1 | -1 | 0 }) =>
      updateQuestion(id, { rating }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank"] }),
  });
}

type TopicItem = {
  id: string;
  parentId: string | null;
  kind: string;
  nameEn: string;
  nameZh: string;
};

export function useTopics(subject?: string) {
  return useQuery({
    queryKey: qk.topics(subject),
    queryFn: async (): Promise<{ items: TopicItem[] }> =>
      isLocalMode
        ? { items: topicsFor(subject as Subject | undefined) }
        : ((await unwrap(
            api.reference.topics.$get({
              query: subject ? { subject } : {},
            } as never),
          )) as never),
    staleTime: 3600_000,
  });
}
