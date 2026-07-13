"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { VocabBankItem } from "@/lib/types";
import {
  IconBook,
  IconCheck,
  IconChevronDown,
  IconSearch,
  IconSliders,
  IconSparkles,
  IconStar,
  IconTrash,
  IconX,
} from "@/components/icons";
import VocabCardBody from "@/components/VocabCardBody";

const CEFR_LEVELS = ["A2", "B1", "B2", "C1", "C2"] as const;

// Levels answer two opposite questions — "drill my C1 words" and "hide the easy
// ones I already know" — so the chips carry a mode instead of only ever meaning
// "show these".
type LevelMode = "only" | "hide";

type PosKey = "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";

const POS_LABELS: Record<PosKey, string> = {
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  adverb: "Adverb",
  phrase: "Phrase",
  other: "Other",
};

const POS_ORDER: PosKey[] = ["noun", "verb", "adjective", "adverb", "phrase", "other"];

/**
 * partOfSpeech is free text from the model — "noun", "adj", "phrasal verb",
 * "noun phrase" — so fold it into buckets a filter can actually use. Phrases
 * are checked first: a "noun phrase" is a phrase, not a noun.
 */
function posKey(raw: string): PosKey {
  const value = raw.toLowerCase().trim();
  if (value.startsWith("adv")) return "adverb";
  if (value.startsWith("adj")) return "adjective";
  if (value.includes("phras")) return "phrase";
  if (value.includes("verb")) return "verb";
  if (value.includes("noun")) return "noun";
  return "other";
}

type Progress = "new" | "learning" | "mastered";

const PROGRESS_LABELS: Record<Progress, string> = {
  new: "Not practiced",
  learning: "Learning",
  mastered: "Mastered",
};

const PROGRESS_ORDER: Progress[] = ["new", "learning", "mastered"];

function progressOf(mastery: number): Progress {
  if (mastery <= 0) return "new";
  return mastery >= 4 ? "mastered" : "learning";
}

type SortKey = "practice" | "newest" | "alpha" | "strongest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "practice", label: "Needs practice" },
  { key: "newest", label: "Newest first" },
  { key: "alpha", label: "A → Z" },
  { key: "strongest", label: "Strongest" },
];

const DEFAULT_SORT: SortKey = "practice";

export default function VocabularyPage() {
  const [items, setItems] = useState<VocabBankItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [cefr, setCefr] = useState<Set<string>>(new Set());
  const [levelMode, setLevelMode] = useState<LevelMode>("only");
  const [types, setTypes] = useState<Set<PosKey>>(new Set());
  const [progress, setProgress] = useState<Set<Progress>>(new Set());
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
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

  function toggleIn<T>(setter: (fn: (prev: Set<T>) => Set<T>) => void, value: T) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function clearFilters() {
    setFavoritesOnly(false);
    setCefr(new Set());
    setLevelMode("only");
    setTypes(new Set());
    setProgress(new Set());
    setSort(DEFAULT_SORT);
  }

  const stats = useMemo(() => {
    const all = items ?? [];
    return {
      total: all.length,
      favorites: all.filter((i) => i.favorite).length,
      thisWeek: all.filter((i) => Date.parse(i.learned_at) >= weekCutoff).length,
      mastered: all.filter((i) => i.mastery >= 4).length,
    };
  }, [items, weekCutoff]);

  // Chip counts, so the filter panel shows what's actually in the bank rather
  // than offering levels and types that would return nothing.
  const counts = useMemo(() => {
    const level = new Map<string, number>();
    const type = new Map<PosKey, number>();
    const prog = new Map<Progress, number>();
    for (const item of items ?? []) {
      level.set(item.card.cefr, (level.get(item.card.cefr) ?? 0) + 1);
      const key = posKey(item.card.partOfSpeech);
      type.set(key, (type.get(key) ?? 0) + 1);
      const p = progressOf(item.mastery);
      prog.set(p, (prog.get(p) ?? 0) + 1);
    }
    return { level, type, prog };
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (items ?? []).filter((item) => {
      if (favoritesOnly && !item.favorite) return false;

      // "only" keeps the picked levels; "hide" drops them.
      if (cefr.size > 0) {
        const picked = cefr.has(item.card.cefr);
        if (levelMode === "only" ? !picked : picked) return false;
      }

      if (types.size > 0 && !types.has(posKey(item.card.partOfSpeech))) return false;
      if (progress.size > 0 && !progress.has(progressOf(item.mastery))) return false;

      if (needle) {
        const haystack = `${item.word} ${item.card.meaning} ${item.card.thai}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case "alpha":
        sorted.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case "newest":
        sorted.sort((a, b) => Date.parse(b.learned_at) - Date.parse(a.learned_at));
        break;
      case "strongest":
        sorted.sort((a, b) => b.mastery - a.mastery || Date.parse(b.learned_at) - Date.parse(a.learned_at));
        break;
      case "practice":
        // Weakest first, and among equally weak words the ones you've been
        // sitting on longest — those are the ones actually going stale.
        sorted.sort(
          (a, b) => a.mastery - b.mastery || Date.parse(a.learned_at) - Date.parse(b.learned_at)
        );
        break;
    }
    return sorted;
  }, [items, favoritesOnly, cefr, levelMode, types, progress, query, sort]);

  const activeFilterCount =
    cefr.size +
    types.size +
    progress.size +
    (favoritesOnly ? 1 : 0) +
    (sort !== DEFAULT_SORT ? 1 : 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
            <IconBook size={30} />
            Vocabulary Bank
          </h1>
          <p className="mt-2 text-sm text-neutral-500 sm:text-base">
            Every word you tap while reading is saved here. Review them until they stick.
          </p>
        </div>

        {/* Practice lives on its own page */}
        <Link
          href="/practice"
          className={`flex shrink-0 items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800 ${
            (items?.length ?? 0) === 0 ? "pointer-events-none opacity-40" : ""
          }`}
          aria-disabled={(items?.length ?? 0) === 0}
        >
          <IconSparkles size={15} />
          Practice
          {(items?.length ?? 0) > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
              {Math.min(items!.length, 10)}
            </span>
          )}
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Words saved", value: stats.total },
          { label: "Mastered", value: stats.mastered },
          { label: "This week", value: stats.thisWeek },
          { label: "Favorites", value: stats.favorites },
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
            // The label is hidden on phones, so name the button for screen readers.
            aria-label="Filters"
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
            <div className="animate-pop-in glass-strong absolute right-0 z-30 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-3xl p-5 shadow-xl">
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

              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Word level
                </p>
                {/* Show only these levels, or hide them — the same chips, both ways round. */}
                <div className="flex rounded-full bg-white/70 p-0.5 ring-1 ring-neutral-200/70">
                  {(
                    [
                      ["only", "Show"],
                      ["hide", "Hide"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLevelMode(mode)}
                      aria-pressed={levelMode === mode}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                        levelMode === mode
                          ? "bg-neutral-950 text-white"
                          : "text-neutral-500 hover:text-neutral-950"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {CEFR_LEVELS.map((level) => {
                  const on = cefr.has(level);
                  const n = counts.level.get(level) ?? 0;
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={n === 0}
                      onClick={() => toggleIn(setCefr, level)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
                        on
                          ? levelMode === "hide"
                            ? "bg-red-600 text-white"
                            : "bg-neutral-950 text-white"
                          : "border border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                      }`}
                    >
                      {on && (levelMode === "hide" ? <IconX size={11} /> : <IconCheck size={11} />)}
                      {level}
                      <span className={on ? "opacity-70" : "text-neutral-400"}>{n}</span>
                    </button>
                  );
                })}
              </div>
              {cefr.size > 0 && (
                <p className="mt-2 text-[11px] text-neutral-400">
                  {levelMode === "only"
                    ? `Showing only ${[...cefr].sort().join(", ")}.`
                    : `Hiding ${[...cefr].sort().join(", ")}.`}
                </p>
              )}

              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Word type
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {POS_ORDER.filter((key) => (counts.type.get(key) ?? 0) > 0).map((key) => {
                  const on = types.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleIn(setTypes, key)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        on
                          ? "bg-neutral-950 text-white"
                          : "border border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                      }`}
                    >
                      {on && <IconCheck size={11} />}
                      {POS_LABELS[key]}
                      <span className={on ? "opacity-70" : "text-neutral-400"}>
                        {counts.type.get(key)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Progress
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {PROGRESS_ORDER.map((key) => {
                  const on = progress.has(key);
                  const n = counts.prog.get(key) ?? 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={n === 0}
                      onClick={() => toggleIn(setProgress, key)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
                        on
                          ? "bg-neutral-950 text-white"
                          : "border border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
                      }`}
                    >
                      {on && <IconCheck size={11} />}
                      {PROGRESS_LABELS[key]}
                      <span className={on ? "opacity-70" : "text-neutral-400"}>{n}</span>
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

      {items !== null && items.length > 0 && visible.length > 0 && (
        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-neutral-400">
            {visible.length === items.length
              ? `${items.length} word${items.length === 1 ? "" : "s"}`
              : `Showing ${visible.length} of ${items.length} words`}
            {sort === "practice" && visible.length > 1 && (
              <span className="text-neutral-300"> · weakest first</span>
            )}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-950"
            >
              <IconX size={11} /> Clear filters
            </button>
          )}
        </div>
      )}

      <ul
        key={`${favoritesOnly}|${levelMode}|${[...cefr].sort().join(",")}|${[...types].sort().join(",")}|${[...progress].sort().join(",")}|${sort}`}
        className="mt-4 grid gap-4 sm:grid-cols-2"
      >
        {visible.map((item, i) => {
          const open = openId === item.id;
          return (
            <li
              key={item.id}
              style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
              className={`animate-card-in glass rounded-3xl p-5 transition-all duration-200 hover:bg-white/85 hover:shadow-[0_20px_44px_-24px_rgb(10_10_10/0.25)] ${
                open ? "sm:col-span-2" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span
                      className={`font-extrabold tracking-tight text-neutral-950 transition-all duration-300 ${
                        open ? "text-3xl" : "text-xl"
                      }`}
                    >
                      {item.word}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {item.card.pronunciation} · {item.card.partOfSpeech}
                    </span>
                    <span className="rounded-full border border-neutral-950 px-2 py-0.5 text-[10px] font-bold text-neutral-950">
                      {item.card.cefr}
                    </span>
                  </p>
                  {!open && (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600">
                      {item.card.meaning}
                    </p>
                  )}
                  {/* Mastery: five pips, filled by correct practice answers */}
                  <span className="mt-2 flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((pip) => (
                      <span
                        key={pip}
                        className={`h-1.5 w-4 rounded-full transition-all duration-300 ${
                          pip < item.mastery ? "bg-emerald-500" : "bg-neutral-950/10"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-[10px] font-medium text-neutral-400">
                      {item.mastery >= 5
                        ? "mastered"
                        : item.review_count > 0
                          ? `${item.review_count} review${item.review_count === 1 ? "" : "s"}`
                          : "not practiced"}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item)}
                    aria-label="Toggle favorite"
                    title={item.favorite ? "Unfavorite" : "Favorite"}
                    className={`rounded-full p-2 transition-all hover:bg-white ${
                      item.favorite ? "text-amber-400" : "text-neutral-300 hover:text-amber-400"
                    }`}
                  >
                    <IconStar size={18} filled={item.favorite} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.id)}
                    aria-label={open ? "Collapse" : "Expand"}
                    className="rounded-full p-2 text-neutral-300 transition-all hover:bg-white hover:text-neutral-950"
                  >
                    <IconChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <div className={`collapse-grid ${open ? "open" : ""}`}>
                <div>
                  <div className="mt-4 border-t border-neutral-200/70 pt-4">
                    <VocabCardBody entry={item.card} expanded />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/70 pt-3">
                      <span className="text-xs text-neutral-400">
                        learned {new Date(item.learned_at).toLocaleDateString()}
                        {item.article_headline && <> · from &ldquo;{item.article_headline}&rdquo;</>}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="flex items-center gap-1.5 rounded-full border border-red-200 bg-white/60 px-4 py-1.5 text-xs font-semibold text-red-500 transition-all duration-150 hover:-translate-y-0.5 hover:bg-red-50"
                      >
                        <IconTrash size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

    </div>
  );
}
