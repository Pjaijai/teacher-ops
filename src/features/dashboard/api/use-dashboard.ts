"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { learnerSnapshot } from "@/features/local/learner";
import {
  getProfile,
  listAttempts,
  listQuestions,
  listSubmissions,
  localDb,
} from "@/features/local/local-db";
import { api, unwrap } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { qk } from "@/lib/query-keys";
import { isWritingSubject, type Subject } from "@/lib/subjects";
import { topicName } from "@/lib/topic-tree";

export type Dashboard = {
  criterionStats: {
    part: string;
    criterion: string;
    ewma: number;
    attempts: number;
    nameEn?: string | null;
    nameZh?: string | null;
  }[];
  topicMastery: {
    topicId: string;
    ewma: number;
    attempts: number;
    nameEn?: string | null;
    nameZh?: string | null;
  }[];
  errorTags: { tag: string; weighted: number; total: number }[];
  nextSteps: {
    id: string;
    kind: string;
    target: Record<string, unknown>;
    rationale: string;
  }[];
  recent: {
    type: "writing" | "practice";
    id: string;
    href: string;
    title: string;
    score: number | null;
    maxScore: number | null;
    createdAt: string;
  }[];
};

const DONE_KEY = "nextStepsClosed";

async function closedSteps() {
  return new Set(
    ((await (await localDb()).get("kv", DONE_KEY)) as string[] | undefined) ??
      [],
  );
}

/** Same simple rules as the server's next-steps.ts, computed in the browser. */
async function localDashboard(subject: Subject): Promise<Dashboard> {
  const [snap, questions, subs, atts, closed] = await Promise.all([
    learnerSnapshot(subject),
    listQuestions(),
    listSubmissions(),
    listAttempts(),
    closedSteps(),
  ]);
  const writing = isWritingSubject(subject);
  const byId = new Map(questions.map((q) => [q.id, q]));

  const steps: Dashboard["nextSteps"] = [];
  const weakCrit = [...snap.criterionStats].sort((a, b) => a.ewma - b.ewma)[0];
  if (writing && weakCrit && weakCrit.ewma < 0.85) {
    steps.push({
      id: `revise:${subject}:${weakCrit.part}:${weakCrit.criterion}`,
      kind: "revise",
      target: { href: "/writing", subject, criterion: weakCrit.criterion },
      rationale: "",
    });
  }
  const tag = snap.errorTags[0];
  if (tag && tag.weighted >= 1.5) {
    steps.push({
      id: `${writing ? "helper" : "question"}:${subject}:${tag.tag}`,
      kind: writing ? "helper" : "question",
      target: {
        href: writing ? "/writing" : `/practice?subject=${subject}`,
        subject,
        tag: tag.tag,
      },
      rationale: "",
    });
  }
  if (!writing) {
    const weak = [...snap.topicMastery]
      .sort((a, b) => a.ewma - b.ewma)
      .find((m) => m.attempts >= 2 && m.ewma < 0.7);
    if (weak)
      steps.push({
        id: `topic:${subject}:${weak.topicId}`,
        kind: "topic",
        target: {
          href: `/practice?topic=${weak.topicId}`,
          subject,
          topicId: weak.topicId,
        },
        rationale: "",
      });
  }

  const recent: Dashboard["recent"] = [
    ...subs.flatMap((s) => {
      const q = byId.get(s.questionId);
      return q && q.subject === subject
        ? [
            {
              type: "writing" as const,
              id: s.id,
              href: `/writing/submissions/${s.id}`,
              title: q.title,
              score: s.estimate?.totalMarks ?? null,
              maxScore: s.estimate?.maxMarks ?? null,
              createdAt: s.createdAt,
            },
          ]
        : [];
    }),
    ...atts.flatMap((a) => {
      const q = byId.get(a.questionId);
      return q && q.subject === subject
        ? [
            {
              type: "practice" as const,
              id: a.id,
              href: `/practice/attempts/${a.id}`,
              title: q.title,
              score: a.score,
              maxScore: a.maxScore,
              createdAt: a.createdAt,
            },
          ]
        : [];
    }),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    criterionStats: snap.criterionStats,
    topicMastery: snap.topicMastery.map((m) => ({
      ...m,
      nameEn: topicName(m.topicId, "en"),
      nameZh: topicName(m.topicId, "zh"),
    })),
    errorTags: snap.errorTags,
    nextSteps: steps.filter((s) => !closed.has(s.id)),
    recent,
  };
}

export function useDashboard(subject: Subject | undefined) {
  return useQuery({
    queryKey: qk.dashboard(subject ?? ""),
    queryFn: (): Promise<Dashboard> =>
      isLocalMode
        ? localDashboard(subject!)
        : (unwrap(
            api.dashboard.$get({ query: { subject: subject! } }),
          ) as never),
    enabled: Boolean(subject),
  });
}

/** Local mode: subjects chosen in the on-device profile. */
export function useLocalSubjects() {
  return useQuery({
    queryKey: ["local", "profile", "subjects"],
    queryFn: async () => (await getProfile()).subjects,
    enabled: isLocalMode,
  });
}

export function useSetNextStep(subject: Subject) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      status: "open" | "done" | "dismissed";
    }) => {
      if (!isLocalMode)
        return unwrap(
          api.dashboard["next-steps"][":id"].$patch({
            param: { id: v.id },
            json: { status: v.status },
          }),
        );
      const closed = await closedSteps();
      if (v.status === "open") closed.delete(v.id);
      else closed.add(v.id);
      await (await localDb()).put("kv", [...closed], DONE_KEY);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dashboard(subject) }),
  });
}
