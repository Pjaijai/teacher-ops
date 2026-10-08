"use client";

import { createId } from "@paralleldrive/cuid2";
import type { JobProgress } from "@/server/db/schema/jobs";
import type { PublicJob } from "@/server/api/routes/jobs";

/**
 * Local-mode jobs: a long AI call to /api/ai/* that streams progress (SSE). The job lives in this
 * browser tab's memory; `onResult` saves what the AI returned (to IndexedDB) before the job is "done",
 * so screens that refetch on done see the saved result. useJobStream follows these by id ("local_…").
 */
const jobs = new Map<string, PublicJob>();
const listeners = new Map<string, Set<(job: PublicJob) => void>>();

export const isLocalJobId = (id: string) => id.startsWith("local_");
export const getLocalJob = (id: string) => jobs.get(id) ?? null;

export function subscribeLocalJob(id: string, fn: (job: PublicJob) => void) {
  const set = listeners.get(id) ?? new Set();
  set.add(fn);
  listeners.set(id, set);
  const current = jobs.get(id);
  if (current) fn(current);
  return () => set.delete(fn);
}

function update(id: string, patch: Partial<PublicJob>) {
  const next = { ...jobs.get(id)!, ...patch };
  jobs.set(id, next);
  for (const fn of listeners.get(id) ?? []) fn(next);
}

export class AiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Start a streamed AI call. Returns the job id immediately. */
export function startAiJob<T>(opts: {
  path: string;
  body: unknown;
  kind: string;
  resourceRef: string;
  onResult: (result: T) => Promise<Record<string, unknown> | void>;
  onError?: (message: string) => Promise<void> | void;
}): string {
  const id = `local_${createId()}`;
  jobs.set(id, { id, kind: opts.kind as PublicJob["kind"], status: "running", resourceRef: opts.resourceRef, output: null, progress: [], error: null });

  void (async () => {
    const progress: JobProgress[] = [];
    try {
      const res = await fetch(`/api/ai/${opts.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts.body),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new AiRequestError(res.status, err.message ?? `Request failed (${res.status})`);
      }
      let result: T | undefined;
      for await (const ev of readSse(res.body)) {
        if (ev.event === "progress") {
          const p = JSON.parse(ev.data) as { step: string; status: "running" | "done" | "failed" };
          const at = new Date().toISOString();
          if (p.status === "running") progress.push({ step: p.step, status: "running", at });
          else {
            const i = progress.findLastIndex((x) => x.step === p.step);
            if (i >= 0) progress[i] = { step: p.step, status: p.status, at };
          }
          update(id, { progress: [...progress] });
        } else if (ev.event === "done") {
          result = (JSON.parse(ev.data) as { result: T }).result;
        } else if (ev.event === "failed") {
          throw new Error((JSON.parse(ev.data) as { error: string }).error);
        }
      }
      if (result === undefined) throw new Error("The AI connection closed before it finished.");
      progress.push({ step: "save", status: "running", at: new Date().toISOString() });
      update(id, { progress: [...progress] });
      const output = (await opts.onResult(result)) ?? {};
      progress[progress.length - 1] = { step: "save", status: "done", at: new Date().toISOString() };
      update(id, { status: "succeeded", progress: [...progress], output });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await opts.onError?.(message);
      update(id, { status: "failed", error: message });
    }
  })();

  return id;
}

/** A short (non-streamed) AI call, e.g. a writing helper. */
export async function callAi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/ai/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiRequestError(res.status, json.message ?? `Request failed (${res.status})`);
  return json as T;
}

async function* readSse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) yield { event, data: data.join("\n") };
    }
  }
}
