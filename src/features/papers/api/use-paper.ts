"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { listPapers } from "@/features/local/local-db";
import { loadPaper, onPaperChange, paperResults } from "./local-papers";

const paperKey = (id: string) => ["papers", id] as const;

/** Refetch paper queries whenever local-papers.ts writes (generation progress, edits, answers). */
function useLiveInvalidation(id?: string) {
  const qc = useQueryClient();
  useEffect(
    () =>
      onPaperChange((changed) => {
        if (!id || changed === id) void qc.invalidateQueries({ queryKey: id ? paperKey(id) : ["papers"] });
      }),
    [id, qc],
  );
}

export function usePaper(id: string) {
  useLiveInvalidation(id);
  return useQuery({ queryKey: paperKey(id), queryFn: () => loadPaper(id), retry: false });
}

export function usePaperResults(id: string, enabled: boolean) {
  useLiveInvalidation(id);
  return useQuery({ queryKey: [...paperKey(id), "results"], queryFn: () => paperResults(id), enabled, retry: false });
}

export function usePapers() {
  useLiveInvalidation();
  return useQuery({ queryKey: ["papers", "list"], queryFn: () => listPapers() });
}
