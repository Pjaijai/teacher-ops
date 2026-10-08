"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { qk } from "@/lib/query-keys";
import type { PublicJob } from "@/server/api/routes/jobs";
import { isLocalJobId, subscribeLocalJob } from "../local-jobs";

/**
 * Follow a long AI job. Cloud mode: Server-Sent Events from /api/jobs/:id/stream. Local mode:
 * an in-tab job (local-jobs.ts). Calls onDone/onFailed once.
 */
export function useJobStream(
  jobId: string | null | undefined,
  handlers: { onDone?: (job: PublicJob) => void; onFailed?: (job: PublicJob) => void } = {},
) {
  const [job, setJob] = useState<PublicJob | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!jobId) return;
    setJob(null);

    if (isLocalJobId(jobId)) {
      let finished = false;
      return subscribeLocalJob(jobId, (j) => {
        setJob(j);
        if (finished) return;
        if (j.status === "succeeded") {
          finished = true;
          handlers.onDone?.(j);
        } else if (j.status === "failed") {
          finished = true;
          handlers.onFailed?.(j);
        }
      });
    }

    const source = new EventSource(`/api/jobs/${jobId}/stream`);
    const read = (e: MessageEvent) => JSON.parse(e.data) as PublicJob;
    source.addEventListener("progress", (e) => setJob(read(e as MessageEvent)));
    source.addEventListener("done", (e) => {
      const j = read(e as MessageEvent);
      setJob(j);
      source.close();
      handlers.onDone?.(j);
      void qc.invalidateQueries({ queryKey: qk.me });
    });
    source.addEventListener("failed", (e) => {
      const j = read(e as MessageEvent);
      setJob(j);
      source.close();
      handlers.onFailed?.(j);
      void qc.invalidateQueries({ queryKey: qk.me });
    });
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are read at event time
  }, [jobId]);

  return job;
}
