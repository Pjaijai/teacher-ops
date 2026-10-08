import { AiRequestError } from "@/features/jobs/local-jobs";
import { ApiClientError } from "@/lib/api-client";
import { LocalWritingError } from "./local-writing";

/** Cloud 402 opens the credits dialog, so no toast is needed for it. */
export const isCreditsError = (e: unknown) => e instanceof ApiClientError && e.status === 402;

/** A message worth showing the student (API, AI or local-store errors), else the fallback. */
export function errorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiClientError || e instanceof AiRequestError || e instanceof LocalWritingError) return e.message;
  return fallback;
}
