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
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Vocabulary Bank</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Every word you tap while reading is saved here. Review them until they stick.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words…"
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
          />
          ⭐ Favorites only
        </label>
        {items && (
          <span className="text-xs text-neutral-500">
            {items.length} word{items.length === 1 ? "" : "s"} learned
          </span>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30">
          {error}
        </p>
      )}

      {!error && items === null && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}

      {items !== null && visible.length === 0 && !error && (
        <p className="mt-6 text-sm text-neutral-500">
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
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
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
                <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
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
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      I remembered it ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => markReviewed(item, false)}
                      className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                    >
                      I forgot it ✗
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
