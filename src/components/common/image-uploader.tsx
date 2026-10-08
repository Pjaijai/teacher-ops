"use client";

import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PickedImage = { file: File; preview: string };

/** Downscale to JPEG; handwriting stays legible at ~2000 px on the long edge and uploads stay small. */
async function toJpeg(file: Blob, name: string, maxEdge = 2000): Promise<PickedImage> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.88));
  const out = new File([blob], name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  return { file: out, preview: URL.createObjectURL(out) };
}

/** Photos in page order: drop, paste, choose or take with the camera; reorder and remove. */
export function ImageUploader({
  images,
  onChange,
  multiple = true,
  max = 8,
  label,
}: {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  multiple?: boolean;
  max?: number;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ images, onChange, multiple });
  latest.current = { images, onChange, multiple };

  const addFiles = async (files: File[]) => {
    const picked = await Promise.all(files.filter((f) => f.type.startsWith("image/")).map((f) => toJpeg(f, f.name || "photo")));
    const { images, onChange, multiple } = latest.current;
    onChange(multiple ? [...images, ...picked].slice(0, max) : picked.slice(0, 1));
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.some((f) => f.type.startsWith("image/"))) void addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (i: number, d: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div
      className="rounded-lg border border-dashed p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void addFiles([...e.dataTransfer.files]);
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={images.length >= max}>
          <ImagePlus className="size-4" /> {label}
        </Button>
        <span className="text-muted-foreground text-xs">⌘V / drag & drop</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        hidden
        onChange={(e) => {
          void addFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={img.preview} alt={`Page ${i + 1}`} className="h-36 w-28 rounded border object-cover" />
              <span className="bg-background/90 absolute top-1 left-1 rounded px-1 text-xs">{i + 1}</span>
              <div className={cn("absolute right-1 bottom-1 flex gap-1")}>
                {i > 0 && (
                  <Button type="button" size="icon" variant="secondary" className="size-6" onClick={() => move(i, -1)} aria-label="Move earlier">
                    <ArrowLeft className="size-3" />
                  </Button>
                )}
                {i < images.length - 1 && (
                  <Button type="button" size="icon" variant="secondary" className="size-6" onClick={() => move(i, 1)} aria-label="Move later">
                    <ArrowRight className="size-3" />
                  </Button>
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 size-6 rounded-full"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label="Remove"
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
