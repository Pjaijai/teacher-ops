import { createMiddleware } from "hono/factory";
import { ApiError } from "@/server/errors";

/**
 * A simple per-IP limit for the open AI API (local mode has no accounts or credits).
 * In-memory per Worker isolate, so it is a speed bump, not a guarantee — add a Cloudflare
 * Rate Limiting rule on /api/ai/* in production.
 */
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export function rateLimit(perHour: number) {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= perHour) {
      throw new ApiError(429, "rate_limited", "Too many AI requests from this network. Please try again later.");
    }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 10_000) hits.clear();
    await next();
  });
}
