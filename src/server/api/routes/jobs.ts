import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { jobs } from "@/server/db/schema";
import { notFound } from "@/server/errors";
import { requireUser, type AppEnv } from "../context";

export const jobRoutes = new Hono<AppEnv>()
  .get("/:id", async (c) => {
    const user = requireUser(c);
    const [job] = await c
      .get("db")
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, c.req.param("id")), eq(jobs.userId, user.id)));
    if (!job) throw notFound("Job not found");
    return c.json(publicJob(job));
  })
  /** Server-Sent Events: `progress` while running, then `done` or `failed`. */
  .get("/:id/stream", async (c) => {
    const user = requireUser(c);
    const db = c.get("db");
    const id = c.req.param("id");
    return streamSSE(c, async (stream) => {
      let lastSent = "";
      for (let i = 0; i < 900; i++) {
        const [job] = await db
          .select()
          .from(jobs)
          .where(and(eq(jobs.id, id), eq(jobs.userId, user.id)));
        if (!job) {
          await stream.writeSSE({ event: "failed", data: JSON.stringify({ error: "Job not found" }) });
          return;
        }
        const payload = JSON.stringify(publicJob(job));
        if (payload !== lastSent) {
          lastSent = payload;
          const event = job.status === "succeeded" ? "done" : job.status === "failed" ? "failed" : "progress";
          await stream.writeSSE({ event, data: payload });
          if (event !== "progress") return;
        }
        await stream.sleep(1000);
      }
    });
  });

function publicJob(job: typeof jobs.$inferSelect) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    resourceRef: job.resourceRef,
    output: job.output,
    progress: job.progress,
    error: job.error,
  };
}
export type PublicJob = ReturnType<typeof publicJob>;
