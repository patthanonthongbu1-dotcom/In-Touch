"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_META, type Article, type Category } from "@/lib/types";
import { useSettings } from "@/lib/settings";

type Filter = "all" | Category;

const CEFR_LEVELS = ["B1", "B2", "C1", "C2"] as const;

function Pill({
  active,
  onClick,
  children,
  small = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full font-medium transition-all duration-200 ${
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${
        active
          ? "bg-neutral-950 text-white shadow-lg shadow-neutral-950/20"
          : "glass text-neutral-600 hover:-translate-y-0.5 hover:bg-white hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const meta = CATEGORY_META[article.category] ?? { emoji: "📰", label: article.category };
  return (
    <Link
      href={`/article/${article.id}`}
      className={`group glass relative flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/85 hover:shadow-[0_28px_56px_-24px_rgb(10_10_10/0.3)] ${
        featured ? "sm:col-span-2" : ""
      }`}
    >
      {article.image_url && (
        <div className={`w-full overflow-hidden ${featured ? "h-52 sm:h-80" : "h-40 sm:h-44"}`}>
          {/* Feed images come from arbitrary news CDNs, so next/image optimization is skipped. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className={`flex flex-1 flex-col p-6 ${featured ? "sm:p-9" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {featured && (
            <span className="rounded-full bg-neutral-950 px-2.5 py-1 text-white">⚡ Top story</span>
          )}
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-neutral-700 ring-1 ring-neutral-200/70">
            {meta.emoji} {meta.label}
          </span>
          <span className="rounded-full border border-neutral-950 bg-white/80 px-2.5 py-1 font-semibold text-neutral-950">
            {article.difficulty}
          </span>
        </div>

        <h3
          className={`mt-4 font-semibold leading-snug tracking-tight text-neutral-950 transition-colors group-hover:text-emerald-800 ${
            featured ? "text-2xl sm:text-3xl" : "text-lg"
          }`}
        >
          {article.headline}
        </h3>

        <p
          className={`mt-2 text-sm leading-relaxed text-neutral-600 ${
            featured ? "line-clamp-3 sm:text-base" : "line-clamp-2"
          }`}
        >
          {article.summary}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-xs text-neutral-400">
          <span>⏱ {article.reading_time_min} min</span>
          <span>📚 {article.vocabulary.length} words</span>
          <span className="truncate">{article.source}</span>
          <span className="ml-auto flex items-center gap-1 font-semibold text-emerald-600 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:-translate-x-2">
            Read more →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function NewsExplorer({ articles }: { articles: Article[] }) {
  const { hiddenCategories } = useSettings();
  const [activeCategory, setActiveCategory] = useState<Filter>("all");
  const [cefr, setCefr] = useState<Set<string>>(new Set());
  const [shortOnly, setShortOnly] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const feedArticles = useMemo(
    () => articles.filter((a) => !hiddenCategories.includes(a.category as Category)),
    [articles, hiddenCategories]
  );

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

  function toggleCefr(level: string) {
    setCefr((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  const visible = feedArticles
    .filter((a) => category === "all" || a.category === category)
    .filter((a) => cefr.size === 0 || cefr.has(a.difficulty))
    .filter((a) => !shortOnly || a.reading_time_min <= 2);

  const [first, ...rest] = visible;
  const hasExtraFilters = cefr.size > 0 || shortOnly;

  return (
    <div>
      {/* Category bar: swipe sideways, or expand to see everything */}
      <div className="flex items-start gap-2">
        <div
          className={`flex flex-1 gap-2 ${
            expanded
              ? "flex-wrap"
              : "pill-scroll -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          }`}
        >
          <Pill active={category === "all"} onClick={() => setActiveCategory("all")}>
            ✨ All · {feedArticles.length}
          </Pill>
          {presentCategories.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <Pill key={cat} active={category === cat} onClick={() => setActiveCategory(cat)}>
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
          className="glass shrink-0 rounded-full px-3 py-2 text-sm text-neutral-600 transition-all hover:bg-white hover:text-neutral-950"
        >
          <span className={`inline-block transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </button>
      </div>

      {/* Extra filters: CEFR level + quick reads */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Filters
        </span>
        {CEFR_LEVELS.map((level) => (
          <Pill key={level} small active={cefr.has(level)} onClick={() => toggleCefr(level)}>
            {level}
          </Pill>
        ))}
        <Pill small active={shortOnly} onClick={() => setShortOnly((v) => !v)}>
          ⏱ Quick reads
        </Pill>
        {hasExtraFilters && (
          <button
            type="button"
            onClick={() => {
              setCefr(new Set());
              setShortOnly(false);
            }}
            className="text-xs font-medium text-neutral-400 underline-offset-2 transition-colors hover:text-neutral-950 hover:underline"
          >
            Clear ✕
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {first && <ArticleCard article={first} featured={category === "all" && !hasExtraFilters} />}
        {rest.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-10 text-center text-sm text-neutral-400">
          Nothing matches these filters today. Try clearing them, or check your category settings.
        </p>
      )}
    </div>
  );
}
