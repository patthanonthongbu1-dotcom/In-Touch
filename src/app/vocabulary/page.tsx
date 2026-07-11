"use client";

import { useEffect, useState } from "react";
import type { VocabBankItem } from "@/lib/types";

const MASTERY_DOTS = 5;

export default function VocabularyPage() {
  const [items, setItems] = useState<VocabBankItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vocab")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setItems(data.items);
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

  async function markReviewed(item: VocabBankItem, correct: boolean) {
    const res = await fetch("/api/vocab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, reviewed: true, correct }),
    });
    if (res.ok) {
      const { mastery } = await res.json();
      setItems(
        (prev) =>
          prev?.map((i) =>
            i.id === item.id
              ? { ...i, review_count: i.review_count + 1, mastery }
              : i
          ) ?? null
      );
    }
  }

  async function remove(item: VocabBankItem) {
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    await fetch(`/api/vocab?id=${item.id}`, { method: "DELETE" });
  }

  const visible = (items ?? []).filter((item) => {
    if (favoritesOnly && !item.favorite) return false;
    if (query && !item.word.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
        📚 Vocabulary Bank
      </h1>
      <p className="mt-2 text-sm text-neutral-500 sm:text-base">
        Every word you tap while reading is saved here. Review them until they stick.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words…"
          className="glass w-full max-w-xs rounded-full px-4 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:bg-white focus:shadow-lg"
        />
        <label className="glass flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-white">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
            className="accent-amber-400"
          />
          ⭐ Favorites only
        </label>
        {items && (
          <span className="text-xs font-medium text-neutral-400">
            {items.length} word{items.length === 1 ? "" : "s"} learned
          </span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur">
          {error}
        </p>
      )}

      {!error && items === null && <p className="mt-8 text-sm text-neutral-400">Loading…</p>}

      {items !== null && visible.length === 0 && !error && (
        <p className="mt-8 text-sm text-neutral-400">
          {items.length === 0
            ? "No words yet — open an article and tap the highlighted words."
            : "No words match your filter."}
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {visible.map((item) => {
          const open = openId === item.id;
          return (
            <li
              key={item.id}
              className="glass rounded-3xl p-5 transition-all duration-300 hover:bg-white/85 hover:shadow-[0_20px_44px_-24px_rgb(23_24_28/0.25)]"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="text-left"
                >
                  <p className="font-semibold">
                    {item.word}{" "}
                    <span className="text-xs font-normal text-neutral-500">
                      {item.card.partOfSpeech} · {item.card.cefr}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                    {item.card.meaning}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item)}
                  aria-label="Toggle favorite"
                  className="text-lg"
                  title={item.favorite ? "Unfavorite" : "Favorite"}
                >
                  {item.favorite ? "⭐" : "☆"}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span title="Mastery">
                  {Array.from({ length: MASTERY_DOTS }, (_, i) =>
                    i < item.mastery ? "●" : "○"
                  ).join(" ")}
                </span>
                <span>{item.review_count} reviews</span>
                <span>learned {new Date(item.learned_at).toLocaleDateString()}</span>
                {item.article_headline && (
                  <span className="truncate">from “{item.article_headline}”</span>
                )}
              </div>

              {open && (
                <div className="mt-4 space-y-2 border-t border-neutral-200/70 pt-4 text-sm">
                  {item.card.thai && (
                    <p>
                      <span className="font-semibold">Thai:</span> {item.card.thai}
                    </p>
                  )}
                  <p className="italic">&ldquo;{item.card.example}&rdquo;</p>
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => markReviewed(item, true)}
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
                    >
                      I remembered it ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => markReviewed(item, false)}
                      className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:bg-amber-600"
                    >
                      I forgot it ✗
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="rounded-full border border-red-200 bg-white/60 px-4 py-1.5 text-xs font-semibold text-red-500 transition-all hover:-translate-y-0.5 hover:bg-red-50"
                    >
                      Delete
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
