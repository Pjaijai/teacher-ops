"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, uploadImages } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import type { PracticeKind, Understanding } from "@/lib/schemas/practice";
import type { Subject } from "@/lib/subjects";
import { localReferenceGenerate, localReferenceUnderstand } from "./local-practice";

/** Step 1: read the reference question (2 credits) → `{jobId}`; job.output.understanding. */
export function useReferenceUnderstand() {
  return useMutation({
    mutationFn: async ({ subject, files, text }: { subject: Subject; files: File[]; text: string }) => {
      if (isLocalMode) return localReferenceUnderstand({ subject, files, text });
      const uploadKeys = files.length ? await uploadImages(files) : [];
      return unwrap(
        api.practice.reference.understand.$post({ json: { subject, uploadKeys, text: text.trim() || undefined } }),
      );
    },
  });
}

/** Step 2: generate private variants (2 credits each) → `{jobId}`; job.output.questionIds. */
export function useReferenceGenerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      subject: Subject;
      understanding: Understanding;
      variation: 1 | 2 | 3;
      kind: PracticeKind;
      count: number;
      language: "zh" | "en";
      /** The student's own steer for the new questions. */
      instructions?: string;
    }) =>
      isLocalMode
        ? localReferenceGenerate(body, () => void qc.invalidateQueries({ queryKey: ["bank"] }))
        : unwrap(api.practice.reference.generate.$post({ json: body })),
  });
}
