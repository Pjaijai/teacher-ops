import { hc } from "hono/client";
import type { AppType } from "@/server/api/app";

/** Typed client for the Hono API: api.writing.submissions.$post({ json }) etc. */
export const api = hc<AppType>(typeof window === "undefined" ? "http://localhost" : window.location.origin).api;

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: Record<string, unknown>,
  ) {
    super(message);
  }
}

type AnyResponse = { ok: boolean; status: number; json(): Promise<unknown> };
/** The success body of a typed client response (drops zod-validator error shapes). */
export type Ok<R extends AnyResponse> = Exclude<Awaited<ReturnType<R["json"]>>, { success: false; error: unknown }>;

/** Unwrap a Hono client response: JSON on success, ApiClientError otherwise. 402 also opens the credits dialog. */
export async function unwrap<R extends AnyResponse>(resPromise: Promise<R>): Promise<Ok<R>> {
  const res = await resPromise;
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as Ok<R>;
  const body = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const err = new ApiClientError(res.status, String(body.error ?? "error"), String(body.message ?? `Request failed (${res.status})`), body);
  if (res.status === 402 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("credits:insufficient", { detail: body }));
  }
  throw err;
}

/** Multipart photo upload (the typed client doesn't cover FormData well). Returns storage keys in order. */
export async function uploadImages(files: File[]): Promise<string[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(res.status, body.error ?? "error", body.message ?? "Upload failed", body);
  return body.keys as string[];
}

export const fileUrl = (key: string) => `/api/uploads/file?key=${encodeURIComponent(key)}`;
