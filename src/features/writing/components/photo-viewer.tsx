"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getImage } from "@/features/local/local-db";
import { fileUrl } from "@/lib/api-client";
import { isLocalMode } from "@/lib/app-mode";
import { cn } from "@/lib/utils";

/** Local mode: a page's key is an image id on this device; show it through an object URL. */
function useLocalImageUrl(id: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isLocalMode || !id) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    void getImage(id).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      setUrl(null);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}

/** The student's handwriting pages, one at a time, with zoom (photos are private to the owner). */
export function PhotoViewer({ pages }: { pages: { pageNo: number; key: string }[] }) {
  const t = useTranslations("writing.review");
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = pages[Math.min(page, pages.length - 1)] as { pageNo: number; key: string } | undefined;
  const localUrl = useLocalImageUrl(current?.key ?? null);
  if (!current) return null;
  const src = isLocalMode ? localUrl : fileUrl(current.key);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {pages.map((p, i) => (
          <Button key={p.key} size="sm" variant={i === page ? "default" : "outline"} onClick={() => setPage(i)}>
            {t("page", { n: p.pageNo })}
          </Button>
        ))}
        <Button size="icon" variant="ghost" className="ml-auto" onClick={() => setZoom((z) => !z)} aria-label={zoom ? t("zoomOut") : t("zoomIn")}>
          {zoom ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
        </Button>
      </div>
      <div className={cn("bg-muted/40 overflow-auto rounded-lg border", zoom ? "max-h-[80vh]" : "max-h-[70vh]")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated image */}
        {src && <img src={src} alt={t("page", { n: current.pageNo })} className={cn("mx-auto block", zoom ? "w-[200%] max-w-none" : "w-full")} />}
      </div>
    </div>
  );
}
