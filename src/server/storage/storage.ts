import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@paralleldrive/cuid2";
import { cloudflareEnv } from "@/server/env";

/**
 * Uploaded photos. On Cloudflare they go to R2 (binding UPLOADS); in Node to ./data/uploads.
 * Keys are always under u/<userId>/ so ownership can be checked from the key and an account
 * deletion can remove everything.
 */
const LOCAL_DIR = () => path.join(process.cwd(), "data", "uploads");

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function ownsKey(userId: string, key: string) {
  return key.startsWith(`u/${userId}/`) && !key.includes("..");
}

export async function putUserFile(userId: string, data: ArrayBuffer, contentType: string) {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `u/${userId}/${createId()}.${ext}`;
  const r2 = cloudflareEnv()?.UPLOADS;
  if (r2) {
    await r2.put(key, data, { httpMetadata: { contentType } });
  } else {
    const file = path.join(LOCAL_DIR(), key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(data));
  }
  return key;
}

export async function getFile(key: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const r2 = cloudflareEnv()?.UPLOADS;
  const contentType = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
  if (r2) {
    const obj = await r2.get(key);
    return obj ? { data: await obj.arrayBuffer(), contentType: obj.httpMetadata?.contentType ?? contentType } : null;
  }
  try {
    const buf = await readFile(path.join(LOCAL_DIR(), key));
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, contentType };
  } catch {
    return null;
  }
}

/** Base64 image for the AI, in page order. */
export async function getImagesForAi(keys: string[]) {
  const images = [];
  for (const key of keys) {
    const f = await getFile(key);
    if (!f) throw new Error(`Uploaded page is missing: ${key}`);
    images.push({
      mediaType: f.contentType as "image/jpeg" | "image/png" | "image/webp",
      data: Buffer.from(f.data).toString("base64"),
    });
  }
  return images;
}

export async function deleteUserFiles(userId: string) {
  if (cloudflareEnv()?.UPLOADS) return; // R2 prefix deletion runs as a scheduled cleanup (see docs/design/migration.md)
  await rm(path.join(LOCAL_DIR(), "u", userId), { recursive: true, force: true });
}
