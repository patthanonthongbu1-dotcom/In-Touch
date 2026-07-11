"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VocabBankItem } from "@/lib/types";
import {
  IconBook,
  IconCheck,
  IconSearch,
  IconSliders,
  IconStar,
  IconTrash,
  IconX,
} from "@/components/icons";

const CEFR_LEVELS = ["A2", "B1", "B2", "C1", "C2"] as const;

type SortKey = "newest" | "alpha";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "alpha", label: "A → Z" },
];

export default function VocabularyPage() {
  const [items, setItems] = useState<VocabBankItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [cefr, setCefr] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("newest");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [weekCutoff, setWeekCutoff] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vocab")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setWeekCutoff(Date.now() - 7 * 24 * 3600 * 1000);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load vocabulary");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function toggleFavorite(item: VocabBankItem) {
    setItems((prev) =>
      prev?.map((i) => (i.id === item.id ? { ...i, favorite: !i.favorite } : i)) ?? null
    );
    await fetch("/api/vocab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, favorite: !item.favorite }),
    });
  }

  async function remove(item: VocabBankItem) {
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    await fetch(`/api/vocab?id=${item.id}`, { method: "DELETE" });
  }

  function toggleCefr(level: string) {
    setCefr((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  const stats = useMemo(() => {
    const all = items ?? [];
    return {
      total: all.length,
      favorites: all.filter((i) => i.favorite).length,
      thisWeek: all.filter((i) => Date.parse(i.learned_at) >= weekCutoff).length,
      advanced: all.filter((i) => i.card.cefr === "C1" || i.card.cefr === "C2").length,
    };
  }, [items, weekCutoff]);

  const visible = useMemo(() => {
    const filtered = (items ?? []).filter((item) => {
      if (favoritesOnly && !item.favorite) return false;
      if (cefr.size > 0 && !cefr.has(item.card.cefr)) return false;
      if (query && !item.word.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sort === "alpha") {
      sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      sorted.sort((a, b) => Date.parse(b.learned_at) - Date.parse(a.learned_at));
    }
    return sorted;
  }, [items, favoritesOnly, cefr, query, sort]);

  const activeFilterCount = cefr.size + (favoritesOnly ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-12">
      <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
        <IconBook size={30} />
        Vocabulary Bank
      </h1>
      <p className="mt-2 text-sm text-neutral-500 sm:text-base">
        Every word you tap while reading is saved here. Review them until they stick.
      </p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Words saved", value: stats.total },
          { label: "Favorites", value: stats.favorites },
          { label: "This week", value: stats.thisWeek },
          { label: "C1+ words", value: stats.advanced },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl font-extrabold tracking-tight text-neutral-950">{stat.value}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search + filter dropdown */}
      <div className="mt-6 flex items-center gap-2">
        <div className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2.5 transition-all focus-within:bg-white focus-within:shadow-lg sm:max-w-xs">
          <IconSearch size={15} className="shrink-0 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search words…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="relative" ref={filtersRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
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
            <div className="glass-strong absolute right-0 z-30 mt-2 w-64 rounded-3xl p-5 shadow-xl">
              <button
                type="button"
                onClick={() => setFavoritesOnly((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  favoritesOnly
                    ? "bg-neutral-950 text-white"
                    : "border border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                }`}
              >
                <IconStar size={11} filled={favoritesOnly} /> Favorites only
              </button>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Word level
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
                Sort by
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      sort === s.key
                        ? "bg-neutral-950 text-white"
                        : "border border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-neutral-200/70 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFavoritesOnly(false);
                    setCefr(new Set());
                    setSort("newest");
                  }}
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

      {error && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur">
          {error}
        </p>
      )}

      {!error && items === null && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="glass space-y-3 rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <div className="shimmer h-5 w-28 rounded-full" />
                <div className="shimmer h-5 w-10 rounded-full" />
              </div>
              <div className="shimmer h-4 w-full rounded-full" />
              <div className="shimmer h-4 w-2/3 rounded-full" />
            </li>
          ))}
        </ul>
      )}

      {items !== null && visible.length === 0 && !error && (
        <p className="mt-8 text-sm text-neutral-400">
          {items.length === 0
            ? "No words yet — open an article and tap the highlighted words."
            : "No words match your filters."}
        </p>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {visible.map((item) => {
          const open = openId === item.id;
          return (
            <li
              key={item.id}
              className={`glass rounded-3xl p-5 transition-all duration-200 hover:bg-white/85 hover:shadow-[0_20px_44px_-24px_rgb(10_10_10/0.25)] ${
                open ? "sm:col-span-2" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="min-w-0 text-left"
                >
                  <p className="flex flex-wrap items-center gap-2 font-bold text-neutral-950">
                    {item.word}
                    <span className="text-xs font-normal text-neutral-500">
                      {item.card.partOfSpeech}
                    </span>
                    <span className="rounded-full border border-neutral-950 px-2 py-0.5 text-[10px] font-bold text-neutral-950">
                      {item.card.cefr}
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                    {item.card.meaning}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item)}
                  aria-label="Toggle favorite"
                  title={item.favorite ? "Unfavorite" : "Favorite"}
                  className={`shrink-0 rounded-full p-2 transition-all hover:bg-white ${
                    item.favorite ? "text-amber-400" : "text-neutral-300 hover:text-amber-400"
                  }`}
                >
                  <IconStar size={18} filled={item.favorite} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-400">
                <span>learned {new Date(item.learned_at).toLocaleDateString()}</span>
              </div>

              {open && (
                <div className="mt-4 space-y-2 border-t border-neutral-200/70 pt-4 text-sm">
                  {item.card.thai && (
                    <p>
                      <span className="font-semibold">Thai:</span> {item.card.thai}
                    </p>
                  )}
                  <p className="italic text-neutral-600">&ldquo;{item.card.example}&rdquo;</p>
                  {item.card.synonyms.length > 0 && (
                    <p>
                      <span className="font-semibold">Synonyms:</span>{" "}
                      {item.card.synonyms.join(", ")}
                    </p>
                  )}
                  {item.card.collocations.length > 0 && (
                    <p>
                      <span className="font-semibold">Collocations:</span>{" "}
                      {item.card.collocations.join(" · ")}
                    </p>
                  )}
                  {item.article_headline && (
                    <p className="text-xs text-neutral-400">
                      from &ldquo;{item.article_headline}&rdquo;
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="flex items-center gap-1.5 rounded-full border border-red-200 bg-white/60 px-4 py-1.5 text-xs font-semibold text-red-500 transition-all duration-150 hover:-translate-y-0.5 hover:bg-red-50"
                    >
                      <IconTrash size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
