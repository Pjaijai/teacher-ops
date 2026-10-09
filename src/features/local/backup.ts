"use client";

import { localDb } from "./local-db";

const STORES = ["questions", "submissions", "attempts", "helpers", "stats", "tags", "papers", "kv"] as const;

/** A JSON backup of everything on this device (photos are left out to keep the file small). */
export async function exportBackup() {
  const db = await localDb();
  const data: Record<string, unknown[]> = {};
  for (const s of STORES) {
    if (s === "kv") data.kv = [{ key: "profile", value: await db.get("kv", "profile") }];
    else data[s] = await db.getAll(s);
  }
  return new Blob([JSON.stringify({ app: "dse-practice", version: 1, exportedAt: new Date().toISOString(), data })], { type: "application/json" });
}

export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as { app?: string; data?: Record<string, unknown[]> };
  if (parsed.app !== "dse-practice" || !parsed.data) throw new Error("This isn't a DSE Practice backup file.");
  const db = await localDb();
  for (const s of STORES) {
    const rows = parsed.data[s] ?? [];
    if (s === "kv") {
      for (const r of rows as { key: string; value: unknown }[]) if (r.value) await db.put("kv", r.value, r.key);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows come from our own export
      for (const r of rows) await db.put(s, r as any);
    }
  }
}

/** Delete everything this app stored on this device, photos included. */
export async function clearAllData() {
  const db = await localDb();
  for (const s of [...STORES, "images"] as const) await db.clear(s);
}
