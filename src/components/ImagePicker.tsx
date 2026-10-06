"use client";

import { useEffect, useRef } from "react";
import type { ImageInput } from "@/lib/ai";

export type PickedImage = ImageInput & { preview: string; name: string };

/** Downscale to keep uploads small; handwriting stays legible at ~2000px on the long edge. */
async function toJpeg(file: Blob, name: string, maxEdge = 2000): Promise<PickedImage> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL("image/jpeg", 0.9);
  return { mediaType: "image/jpeg", data: preview.split(",")[1], preview, name };
}

export function ImagePicker({
  images,
  onChange,
  multiple = false,
  label,
}: {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  multiple?: boolean;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ images, onChange, multiple });
  latest.current = { images, onChange, multiple };

  const addFiles = async (files: Blob[], names: string[]) => {
    const picked = await Promise.all(files.map((f, i) => toJpeg(f, names[i])));
    const { images, onChange, multiple } = latest.current;
    onChange(multiple ? [...images, ...picked] : picked.slice(0, 1));
  };

  // Paste a screenshot anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length) addFiles(files, files.map((_, i) => `pasted-${i + 1}`));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div
      className="dropzone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
        addFiles(files, files.map((f) => f.name));
      }}
    >
      <p>
        {label} — drop, paste (⌘V) or{" "}
        <button type="button" className="link" onClick={() => inputRef.current?.click()}>choose file{multiple ? "s" : ""}</button>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          addFiles(files, files.map((f) => f.name));
          e.target.value = "";
        }}
      />
      {images.length > 0 && (
        <div className="thumbs">
          {images.map((img, i) => (
            <div key={i} className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt={img.name} />
              <span>{multiple ? `Page ${i + 1}` : img.name}</span>
              <button type="button" className="link" onClick={() => onChange(images.filter((_, j) => j !== i))}>remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  if (!res.ok || json.error) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}
