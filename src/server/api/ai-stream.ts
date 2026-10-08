import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { StepRunner } from "@/server/jobs/job-runner";

/**
 * Run AI work inside one request and stream its progress as Server-Sent Events:
 *   progress {step, status}  …  then  done {result}  or  failed {error}
 * Used by the stateless AI API in local mode (no job rows to poll).
 */
export function streamWork<T>(c: Context, work: (step: StepRunner) => Promise<T>) {
  return streamSSE(c, async (stream) => {
    const send = (event: string, data: unknown) => stream.writeSSE({ event, data: JSON.stringify(data) });
    const step: StepRunner = async (name, fn) => {
      await send("progress", { step: name, status: "running" });
      try {
        const out = await fn();
        await send("progress", { step: name, status: "done" });
        return out;
      } catch (e) {
        await send("progress", { step: name, status: "failed" });
        throw e;
      }
    };
    try {
      const result = await work(step);
      await send("done", { result });
    } catch (e) {
      console.error("ai work failed:", e);
      await send("failed", { error: e instanceof Error ? e.message : String(e) });
    }
  });
}
