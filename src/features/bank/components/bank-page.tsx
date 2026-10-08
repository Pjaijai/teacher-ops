"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isLocalMode } from "@/lib/app-mode";
import { usePathname, useRouter } from "@/lib/i18n/routing";
import {
  filtersFromParams,
  filtersToParams,
  useBankSearch,
  useTopics,
  type BankFilters,
} from "../api/use-bank-search";
import { BankFilterPanel } from "./bank-filters";
import { QuestionPreviewCard } from "./question-preview-card";

/** Question bank: search + filters live in the URL so a search can be shared. */
export function BankPage() {
  const t = useTranslations("bank");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(
    () => filtersFromParams(new URLSearchParams(params.toString())),
    [params],
  );
  const [text, setText] = useState(filters.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const update = useCallback(
    (patch: Partial<BankFilters>) => {
      const next = { ...filters, ...patch };
      const qs = filtersToParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  // Debounce typing into the URL.
  useEffect(() => {
    if ((filters.q ?? "") === text.trim()) return;
    const id = setTimeout(() => update({ q: text.trim() || undefined }), 350);
    return () => clearTimeout(id);
  }, [text, filters.q, update]);

  const search = useBankSearch(filters);
  const topics = useTopics(filters.subject);
  const topicNames = useMemo(
    () =>
      new Map(
        (topics.data?.items ?? []).map((x) => [
          x.id,
          { en: x.nameEn, zh: x.nameZh },
        ]),
      ),
    [topics.data],
  );
  const items = search.data?.pages.flatMap((p) => p.items) ?? [];

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = search;
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (e) =>
        e[0].isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage &&
        void fetchNextPage(),
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => k !== "q" && (Array.isArray(v) ? v.length : Boolean(v)),
  ).length;

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold">
          {isLocalMode ? t("localTitle") : t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isLocalMode ? t("localIntro") : t("intro")}
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isLocalMode ? t("localSearchPlaceholder") : t("searchPlaceholder")
            }
            className="pl-8"
            aria-label={t("search")}
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters((s) => !s)}
        >
          <SlidersHorizontal /> {t("filters")}
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="rounded-lg border p-4">
          <BankFilterPanel filters={filters} onChange={update} />
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() =>
                router.replace(
                  filters.q
                    ? `${pathname}?q=${encodeURIComponent(filters.q)}`
                    : pathname,
                )
              }
            >
              <X /> {t("clear")}
            </Button>
          )}
        </div>
      )}

      {search.isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : search.isError ? (
        <p className="text-destructive text-sm">{t("loadFailed")}</p>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          {filters.q || activeCount
            ? t("noResults")
            : isLocalMode
              ? t("localEmpty")
              : t("empty")}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <QuestionPreviewCard
              key={item.id}
              item={item as never}
              topicNames={topicNames}
            />
          ))}
          <div ref={sentinel} className="flex h-10 items-center justify-center">
            {isFetchingNextPage && (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
