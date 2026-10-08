import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/server/db/client";
import { aiRuns, jobs, type JobProgress } from "@/server/db/schema";
import type { UsageSink } from "@/server/ai/open-router";
import { cloudflareEnv } from "@/server/env";
import { refundCredits } from "@/server/services/credits/credits";

export type JobKind = (typeof jobs.$inferSelect)["kind"];

/** Runs one named step. On Cloudflare this is a Workflow `step.do` (retried, durable); in Node it just runs. */
export type StepRunner = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

export type JobContext = {
  db: Db;
  jobId: string;
  userId: string;
  input: Record<string, unknown>;
  resourceRef: string;
  step: StepRunner;
  onUsage: UsageSink;
};

export type JobHandler = (ctx: JobContext) => Promise<Record<string, unknown> | void>;

const handlers = new Map<JobKind, JobHandler>();

/** Feature modules register their long-running work here (see server/jobs/handlers.ts). */
export function registerJob(kind: JobKind, handler: JobHandler) {
  handlers.set(kind, handler);
}

/** Create the job row and start it. The caller has already charged `credits`. */
export async function startJob(
  db: Db,
  opts: { userId: string; kind: JobKind; resourceRef: string; input?: Record<string, unknown>; credits: number },
) {
  const [job] = await db
    .insert(jobs)
    .values({
      userId: opts.userId,
      kind: opts.kind,
      resourceRef: opts.resourceRef,
      input: opts.input ?? {},
      creditsCharged: opts.credits,
    })
    .returning({ id: jobs.id });
  await dispatchJob(job.id);
  return job.id;
}

async function dispatchJob(jobId: string) {
  const workflow = cloudflareEnv()?.JOB_WORKFLOW;
  if (workflow) {
    await workflow.create({ id: jobId, params: { jobId } });
    return;
  }
  // Node (local dev): run in the background of this process.
  void runJob(jobId).catch((e) => console.error("job crashed", jobId, e));
}

/** Execute a job: used by the Node runner and by the Cloudflare Workflow (worker.ts). */
export async function runJob(jobId: string, step?: StepRunner) {
  await import("./handlers");
  const db = await getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job || job.status === "succeeded") return;
  const handler = handlers.get(job.kind);
  if (!handler) throw new Error(`No handler for job kind ${job.kind}`);

  const progress: JobProgress[] = [...job.progress];
  const save = async (patch: Partial<typeof jobs.$inferInsert>) => {
    await db.update(jobs).set({ ...patch, progress: [...progress] }).where(eq(jobs.id, jobId));
  };
  await save({ status: "running" });

  const tracked: StepRunner = async (name, fn) => {
    progress.push({ step: name, status: "running", at: new Date().toISOString() });
    await save({});
    try {
      const result = await (step ? step(name, fn) : fn());
      progress[progress.length - 1] = { step: name, status: "done", at: new Date().toISOString() };
      await save({});
      return result;
    } catch (e) {
      progress[progress.length - 1] = { step: name, status: "failed", at: new Date().toISOString() };
      await save({});
      throw e;
    }
  };

  const onUsage: UsageSink = async (purpose, u) => {
    await db.insert(aiRuns).values({
      userId: job.userId,
      jobId,
      purpose,
      model: u.model,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      costUsd: u.costUsd?.toFixed(6) ?? null,
      latencyMs: u.latencyMs,
    });
  };

  try {
    const output = await handler({ db, jobId, userId: job.userId, input: job.input, resourceRef: job.resourceRef, step: tracked, onUsage });
    await save({ status: "succeeded", output: output ?? null, finishedAt: new Date() });
  } catch (e) {
    console.error("job failed", jobId, e);
    await save({ status: "failed", error: e instanceof Error ? e.message : String(e), finishedAt: new Date() });
    await refundCredits(db, job.userId, job.creditsCharged, jobId);
  }
}
