import { and, desc, eq, gte, sql } from "drizzle-orm";
import { CREDIT_COSTS, DAILY_QUOTA, type CreditAction } from "@/lib/credits";
import type { Db } from "@/server/db/client";
import { creditLedger } from "@/server/db/schema";
import { ApiError } from "@/server/errors";

/** Start of today in Hong Kong (UTC+8, no DST). */
export function startOfTodayHkt(now = new Date()): Date {
  const hk = new Date(now.getTime() + 8 * 3600_000);
  hk.setUTCHours(0, 0, 0, 0);
  return new Date(hk.getTime() - 8 * 3600_000);
}

export function nextResetHkt(now = new Date()): Date {
  return new Date(startOfTodayHkt(now).getTime() + 24 * 3600_000);
}

export async function creditBalance(db: Db, userId: string) {
  const [row] = await db
    .select({ spent: sql<number>`coalesce(sum(${creditLedger.delta}), 0)::int` })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), gte(creditLedger.createdAt, startOfTodayHkt())));
  return { balance: DAILY_QUOTA + Number(row?.spent ?? 0), quota: DAILY_QUOTA, resetsAt: nextResetHkt().toISOString() };
}

/**
 * Charge before starting AI work. Throws 402 when the balance is too low.
 * Returns the amount charged so a failed job can refund exactly that.
 */
export async function chargeCredits(db: Db, userId: string, action: CreditAction, opts: { units?: number; jobId?: string } = {}) {
  const cost = CREDIT_COSTS[action] * (opts.units ?? 1);
  if (cost === 0) return 0;
  const { balance } = await creditBalance(db, userId);
  if (balance < cost) {
    throw new ApiError(402, "credits", "Not enough credits today.", { balance, cost });
  }
  await db.insert(creditLedger).values({ userId, delta: -cost, reason: action, jobId: opts.jobId ?? null });
  return cost;
}

export async function refundCredits(db: Db, userId: string, amount: number, jobId: string | null, reason = "refund") {
  if (amount <= 0) return;
  await db.insert(creditLedger).values({ userId, delta: amount, reason, jobId });
}

export async function creditHistory(db: Db, userId: string, limit = 50) {
  return db
    .select({ delta: creditLedger.delta, reason: creditLedger.reason, createdAt: creditLedger.createdAt })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .orderBy(desc(creditLedger.createdAt))
    .limit(limit);
}
