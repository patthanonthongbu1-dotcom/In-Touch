"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_META, type Article, type Category } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { formatTimeBangkok } from "@/lib/dates";
import {
  IconBook,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconSliders,
  IconSparkles,
  IconX,
} from "@/components/icons";

type Filter = "all" | Category;
type Sort = "latest" | "top";

const CEFR_LEVELS = ["B1", "B2", "C1", "C2"] as const;

function publishedMs(article: Article): number {
  const iso = article.source_published_at ?? article.created_at;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function Pill({
  active,
  hasIndicator,
  onClick,
  dataKey,
  children,
}: {
  active: boolean;
  hasIndicator: boolean;
  onClick: () => void;
  dataKey: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-pill={dataKey}
      onClick={onClick}
      className={`relative z-10 shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? hasIndicator
            ? "text-white"
            : "bg-neutral-950 text-white"
          : "glass text-neutral-600 hover:-translate-y-0.5 hover:bg-white hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}

function ArticleCard({
  article,
  featured = false,
  featuredBadge = "Top story",
  read = false,
}: {
  article: Article;
  featured?: boolean;
  featuredBadge?: string;
  read?: boolean;
}) {
  const meta = CATEGORY_META[article.category] ?? { emoji: "📰", label: article.category };
  return (
    <Link
      href={`/article/${article.id}`}
      transitionTypes={["nav-forward"]}
      className={`group glass relative flex h-full flex-col overflow-hidden rounded-3xl ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1.5 hover:bg-white/85 hover:shadow-[0_28px_56px_-24px_rgb(10_10_10/0.3)] hover:ring-neutral-950/25 ${
        read ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      <div className={`w-full overflow-hidden ${featured ? "h-52 sm:h-80" : "h-28 sm:h-44"}`}>
        {article.image_url ? (
          /* Feed images come from arbitrary news CDNs, so next/image optimization is skipped. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* Designed stand-in for stories without a feed image. */
          <div
            className="relative flex h-full w-full items-center justify-center"
            style={{
              background:
                "radial-gradient(120% 90% at 20% 0%, rgb(16 185 129 / 0.14), transparent 60%), radial-gradient(120% 90% at 90% 100%, rgb(56 189 248 / 0.14), transparent 60%), linear-gradient(135deg, #f5f5f6, #ececee)",
            }}
          >
            <span
              aria-hidden
              className={`flex items-center justify-center rounded-full bg-white/85 shadow-[0_10px_28px_-14px_rgb(10_10_10/0.35)] ring-1 ring-white transition-transform duration-300 group-hover:scale-110 ${
                featured ? "h-24 w-24 text-5xl" : "h-14 w-14 text-2xl sm:h-16 sm:w-16 sm:text-3xl"
              }`}
            >
              {meta.emoji}
            </span>
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${featured ? "p-6 sm:p-9" : "p-3.5 sm:p-6"}`}>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium sm:gap-2">
          {featured && (
            <span className="flex items-center gap-1 rounded-full bg-neutral-950 px-2.5 py-1 text-white">
              <IconSparkles size={12} /> {featuredBadge}
            </span>
          )}
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-neutral-700 ring-1 ring-neutral-200/70 sm:px-2.5 sm:py-1">
            {meta.emoji}
            <span className={featured ? "" : "hidden sm:inline"}> {meta.label}</span>
          </span>
          <span className="rounded-full border border-neutral-950 bg-white/80 px-2 py-0.5 font-semibold text-neutral-950 sm:px-2.5 sm:py-1">
            {article.difficulty}
          </span>
          {read && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-white sm:px-2.5 sm:py-1">
              <IconCheck size={11} /> Read
            </span>
          )}
        </div>

        <h3
          className={`break-words font-semibold leading-snug tracking-tight text-neutral-950 ${
            featured ? "mt-4 text-2xl sm:text-3xl" : "mt-2 text-sm sm:mt-4 sm:text-lg"
          }`}
        >
          {article.headline}
        </h3>

        <p
          className={`break-words leading-relaxed text-neutral-600 ${
            featured
              ? "mt-2 line-clamp-3 text-sm sm:text-base"
              : "mt-1.5 line-clamp-2 text-xs sm:mt-2 sm:text-sm"
          }`}
        >
          {article.summary}
        </p>

        <div
          className={`mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 ${
            featured ? "pt-5" : "pt-3 sm:pt-5"
          }`}
        >
          <span className="flex shrink-0 items-center gap-1">
            <IconClock size={12} /> {article.reading_time_min} min
          </span>
          <span className={`shrink-0 items-center gap-1 ${featured ? "flex" : "hidden sm:flex"}`}>
            <IconBook size={12} /> {article.vocabulary.length} words
          </span>
          <span
            className={`shrink-0 ${featured ? "" : "hidden sm:inline"}`}
            title="Added to InTouch (Bangkok time)"
          >
            ↑ {formatTimeBangkok(article.created_at)}
          </span>
          <span className="min-w-0 max-w-full flex-1 truncate">{article.source}</span>
          <span className="ml-auto hidden shrink-0 items-center gap-1 font-semibold text-neutral-950 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:flex sm:-translate-x-2">
            Read more →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function NewsExplorer({ articles }: { articles: Article[] }) {
  const {
    hiddenCategories,
    readArticles,
    defaultSort,
    defaultLevels,
    quickReadsOnly,
    thaiStoriesPerDay,
  } = useSettings();
  const [activeCategory, setActiveCategory] = useState<Filter>("all");
  // Settings seed the feed's opening state; changing a filter here is a
  // one-off for this visit and doesn't rewrite the saved preference.
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [cefr, setCefr] = useState<Set<string>>(() => new Set(defaultLevels));
  const [shortOnly, setShortOnly] = useState(quickReadsOnly);
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const touchedRef = useRef(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [filtersOpen]);

  // Settings arrive from localStorage only after hydration, so the saved
  // filters land here rather than in useState — until the reader touches a
  // filter themselves, at which point this visit is theirs to steer.
  useEffect(() => {
    if (touchedRef.current) return;
    setSort(defaultSort);
    setCefr(new Set(defaultLevels));
    setShortOnly(quickReadsOnly);
  }, [defaultSort, defaultLevels, quickReadsOnly]);

  // One report serves everyone, curated for whoever asked for the most Thai
  // stories — so each reader keeps only the number they chose, most important
  // first. Articles arrive sorted by importance.
  const feedArticles = useMemo(() => {
    const shown = articles.filter((a) => !hiddenCategories.includes(a.category as Category));
    const thaiKept = new Set(
      shown
        .filter((a) => a.category === "thailand")
        .slice(0, thaiStoriesPerDay)
        .map((a) => a.id)
    );
    return shown.filter((a) => a.category !== "thailand" || thaiKept.has(a.id));
  }, [articles, hiddenCategories, thaiStoriesPerDay]);

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const article of feedArticles) {
      const category = article.category as Category;
      map.set(category, (map.get(category) ?? 0) + 1);
    }
    return map;
  }, [feedArticles]);

  const presentCategories = CATEGORIES.filter((category) => (counts.get(category) ?? 0) > 0);
  const category: Filter =
    activeCategory !== "all" && !presentCategories.includes(activeCategory as Category)
      ? "all"
      : activeCategory;

  // Slide the black indicator blob under whichever pill is active.
  useEffect(() => {
    const activePill = () =>
      barRef.current?.querySelector<HTMLButtonElement>(`[data-pill="${CSS.escape(category)}"]`);
    const measure = () => {
      const el = activePill();
      if (!el) return;
      setIndicator({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    };
    const raf = requestAnimationFrame(() => {
      measure();
      activePill()?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [category, expanded, presentCategories.length, feedArticles.length]);

  function toggleCefr(level: string) {
    touchedRef.current = true;
    setCefr((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function chooseSort(value: Sort) {
    touchedRef.current = true;
    setSort(value);
  }

  function toggleShortOnly() {
    touchedRef.current = true;
    setShortOnly((v) => !v);
  }

  function clearFilters() {
    touchedRef.current = true;
    setCefr(new Set());
    setShortOnly(false);
  }

  const visible = feedArticles
    .filter((a) => category === "all" || a.category === category)
    .filter((a) => cefr.size === 0 || cefr.has(a.difficulty))
    .filter((a) => !shortOnly || a.reading_time_min <= 2)
    // Server order is importance ("top"); "latest" re-sorts newest first.
    .sort((a, b) => (sort === "latest" ? publishedMs(b) - publishedMs(a) : 0));

  const activeFilterCount = cefr.size + (shortOnly ? 1 : 0);
  const readCount = feedArticles.filter((a) => readArticles.includes(a.id)).length;
  const progress = feedArticles.length > 0 ? (readCount / feedArticles.length) * 100 : 0;

  return (
    <div>
      {/* Daily reading progress */}
      {feedArticles.length > 0 && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between text-xs font-medium">
            <span className="uppercase tracking-wider text-neutral-400">
              Today&apos;s progress
            </span>
            <span className="text-neutral-950">
              {readCount === feedArticles.length && readCount > 0 ? "🎉 " : ""}
              {readCount} / {feedArticles.length} read
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-950/10">
            <div
              className="h-full rounded-full bg-neutral-950 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Category bar: swipe sideways, expand to see everything, filters dropdown */}
      <div className="flex items-start gap-2">
        <div
          ref={barRef}
          key={expanded ? "wrapped" : "single-row"}
          className={`animate-fade-in relative flex flex-1 gap-2 ${
            expanded
              ? "flex-wrap"
              : "pill-scroll -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          }`}
        >
          {indicator && (
            <span
              aria-hidden
              style={indicator}
              className="absolute z-0 rounded-full bg-neutral-950 shadow-lg shadow-neutral-950/20 transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
            />
          )}
          <Pill
            active={category === "all"}
            hasIndicator={indicator !== null}
            dataKey="all"
            onClick={() => setActiveCategory("all")}
          >
            ✨ All · {feedArticles.length}
          </Pill>
          {presentCategories.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <Pill
                key={cat}
                active={category === cat}
                hasIndicator={indicator !== null}
                dataKey={cat}
                onClick={() => setActiveCategory(cat)}
              >
                {meta.emoji} {meta.label} · {counts.get(cat)}
              </Pill>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse categories" : "Expand categories"}
          title={expanded ? "Collapse" : "Show all categories"}
          className="glass shrink-0 rounded-full p-2.5 text-neutral-600 transition-all hover:bg-white hover:text-neutral-950"
        >
          <IconChevronDown
            size={16}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <div className="relative shrink-0" ref={filtersRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 ${
              filtersOpen || activeFilterCount > 0
                ? "bg-neutral-950 text-white shadow-lg shadow-neutral-950/20"
                : "glass text-neutral-600 hover:bg-white hover:text-neutral-950"
            }`}
          >
            <IconSliders size={15} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-neutral-950">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filtersOpen && (
            <div className="animate-pop-in glass-strong absolute right-0 z-30 mt-2 w-64 rounded-3xl p-5 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Sort by
              </p>
              <div className="mt-2.5 flex rounded-full bg-white/70 p-1 ring-1 ring-neutral-200/70">
                {(
                  [
                    ["latest", "🕐 Latest"],
                    ["top", "✨ Top stories"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseSort(value)}
                    className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      sort === value
                        ? "bg-neutral-950 text-white shadow"
                        : "text-neutral-500 hover:text-neutral-950"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Reading level
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {CEFR_LEVELS.map((level) => {
                  const on = cefr.has(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleCefr(level)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        on
                          ? "bg-neutral-950 text-white"
                          : "border border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                      }`}
                    >
                      {on && <IconCheck size={11} />}
                      {level}
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Length
              </p>
              <button
                type="button"
                onClick={toggleShortOnly}
                className={`mt-2.5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  shortOnly
                    ? "bg-neutral-950 text-white"
                    : "border border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                }`}
              >
                <IconClock size={11} /> Quick reads (≤ 2 min)
              </button>

              <div className="mt-5 flex items-center justify-between border-t border-neutral-200/70 pt-4">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                  className="flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-950 disabled:opacity-40"
                >
                  <IconX size={11} /> Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-full bg-neutral-950 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-neutral-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        key={`${category}|${sort}|${[...cefr].sort().join(",")}|${shortOnly}`}
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-5"
      >
        {visible.map((article, i) => {
          const featured = i === 0 && category === "all" && activeFilterCount === 0;
          return (
            <div
              key={article.id}
              className={`animate-card-in ${featured ? "col-span-2" : ""}`}
              style={{ animationDelay: `${Math.min(i * 45, 400)}ms` }}
            >
              <ArticleCard
                article={article}
                featured={featured}
                featuredBadge={sort === "latest" ? "Just in" : "Top story"}
                read={readArticles.includes(article.id)}
              />
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="mt-10 text-center text-sm text-neutral-400">
          Nothing matches these filters today. Try clearing them, or check your category settings.
        </p>
      )}
    </div>
  );
}
