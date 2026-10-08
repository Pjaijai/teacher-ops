export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "credits"
  | "validation"
  | "rate_limited"
  | "conflict"
  | "ai_failed";

/** An error meant for the student. The API turns it into `{ error, message, ...extra }` with `status`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new ApiError(404, "not_found", what);
export const forbidden = (what = "You can't do that") => new ApiError(403, "forbidden", what);
export const invalid = (what: string) => new ApiError(400, "validation", what);
