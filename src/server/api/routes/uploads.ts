import { Hono } from "hono";
import { ApiError, forbidden, notFound } from "@/server/errors";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, getFile, ownsKey, putUserFile } from "@/server/storage/storage";
import { requireUser, type AppEnv } from "../context";

/** Photos go through the API (multipart, field "files"), so no storage credentials reach the browser. */
export const uploadRoutes = new Hono<AppEnv>()
  .post("/", async (c) => {
    const user = requireUser(c);
    const form = await c.req.formData();
    const files = form.getAll("files").filter((f): f is File => typeof f !== "string");
    if (files.length === 0 || files.length > 8) throw new ApiError(400, "validation", "Upload 1–8 images.");
    const keys: string[] = [];
    for (const f of files) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(f.type)) throw new ApiError(400, "validation", "Only JPEG, PNG or WebP images.");
      if (f.size > MAX_UPLOAD_BYTES) throw new ApiError(400, "validation", "Each image must be under 10 MB.");
      keys.push(await putUserFile(user.id, await f.arrayBuffer(), f.type));
    }
    return c.json({ keys });
  })
  .get("/file", async (c) => {
    const user = requireUser(c);
    const key = c.req.query("key") ?? "";
    if (!ownsKey(user.id, key)) throw forbidden();
    const file = await getFile(key);
    if (!file) throw notFound();
    return c.body(file.data, 200, { "Content-Type": file.contentType, "Cache-Control": "private, max-age=3600" });
  });
