import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Bindings available on Cloudflare (see wrangler.jsonc). Absent in plain Node (scripts, tests). */
export type CloudflareBindings = {
  HYPERDRIVE?: { connectionString: string };
  UPLOADS?: R2Bucket;
  JOB_WORKFLOW?: { create(opts: { id?: string; params: unknown }): Promise<unknown> };
};

type R2Bucket = {
  put(key: string, value: ArrayBuffer | Uint8Array | ReadableStream, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  delete(keys: string | string[]): Promise<void>;
};

let workflowEnv: (CloudflareBindings & Record<string, unknown>) | null = null;

/** Inside a Cloudflare Workflow there is no Next request context, so worker.ts hands us the env directly. */
export function setWorkflowEnv(env: CloudflareBindings & Record<string, unknown>) {
  workflowEnv = env;
}

export function cloudflareEnv(): (CloudflareBindings & Record<string, unknown>) | null {
  if (workflowEnv) return workflowEnv;
  try {
    return getCloudflareContext().env as unknown as CloudflareBindings & Record<string, unknown>;
  } catch {
    return null;
  }
}

/** A string setting: Worker secret/var first, then process.env. */
export function setting(name: string): string | undefined {
  const fromCf = cloudflareEnv()?.[name];
  if (typeof fromCf === "string" && fromCf) return fromCf;
  return process.env[name] || undefined;
}

export function requireSetting(name: string): string {
  const v = setting(name);
  if (!v) throw new Error(`${name} is not set (add it to .env.local, or as a Worker secret).`);
  return v;
}
