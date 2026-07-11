"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_META, type Article, type Category } from "@/lib/types";

type Filter = "all" | Category;

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-neutral-900 text-white shadow-lg shadow-neutral-900/20"
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
      className={`group glass relative flex flex-col rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/85 hover:shadow-[0_28px_56px_-24px_rgb(23_24_28/0.3)] ${
        featured ? "sm:col-span-2 sm:p-9" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {featured && (
          <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-white">
            ⚡ Top story
          </span>
        )}
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-neutral-600 ring-1 ring-neutral-200/70">
          {meta.emoji} {meta.label}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200/70">
          Level {article.difficulty}
        </span>
      </div>

      <h3
        className={`mt-4 font-semibold leading-snug tracking-tight text-neutral-900 transition-colors group-hover:text-emerald-800 ${
          featured ? "text-2xl sm:text-3xl" : "text-lg"
        }`}
      >
        {article.headline}
      </h3>

      <p
        className={`mt-2 text-sm leading-relaxed text-neutral-500 ${
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
    </Link>
  );
}

export default function NewsExplorer({ articles }: { articles: Article[] }) {
  const [active, setActive] = useState<Filter>("all");

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const article of articles) {
      const category = article.category as Category;
      map.set(category, (map.get(category) ?? 0) + 1);
    }
    return map;
  }, [articles]);

  const presentCategories = CATEGORIES.filter((category) => (counts.get(category) ?? 0) > 0);
  const visible = active === "all" ? articles : articles.filter((a) => a.category === active);
  const [first, ...rest] = visible;

  return (
    <div>
      <div className="pill-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        <Pill active={active === "all"} onClick={() => setActive("all")}>
          ✨ All · {articles.length}
        </Pill>
        {presentCategories.map((category) => {
          const meta = CATEGORY_META[category];
          return (
            <Pill
              key={category}
              active={active === category}
              onClick={() => setActive(category)}
            >
              {meta.emoji} {meta.label} · {counts.get(category)}
            </Pill>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {first && <ArticleCard article={first} featured={active === "all"} />}
        {rest.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-10 text-center text-sm text-neutral-400">
          Nothing in this category today.
        </p>
      )}
    </div>
  );
}
