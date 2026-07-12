"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { VocabBankItem } from "@/lib/types";
import PracticeSession, {
  PRACTICE_MODES,
  type PracticeMode,
} from "@/components/PracticeSession";
import { IconBook, IconSparkles } from "@/components/icons";

function isMode(value: string | null): value is PracticeMode {
  return PRACTICE_MODES.some((m) => m.key === value);
}

export default function PracticePage() {
  const params = useSearchParams();
  const [items, setItems] = useState<VocabBankItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ?mode=… lets the Vocabulary page deep-link straight into a round.
  const initial = params.get("mode");
  const [mode, setMode] = useState<PracticeMode | null>(isMode(initial) ? initial : null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vocab")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't load your words");
        return data;
      })
      .then((data) => !cancelled && setItems(data.items ?? []))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Practice results feed the mastery/review counters shown on the profile.
  async function recordReview(id: string, correct: boolean) {
    setItems(
      (prev) =>
        prev?.map((i) =>
          i.id === id
            ? {
                ...i,
                review_count: i.review_count + 1,
                mastery: correct ? Math.min(5, i.mastery + 1) : Math.max(0, i.mastery - 1),
              }
            : i
        ) ?? null
    );
    await fetch("/api/vocab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewed: true, correct }),
    });
  }

  const total = items?.length ?? 0;
  const weakest = [...(items ?? [])].sort(
    (a, b) => a.mastery - b.mastery || a.review_count - b.review_count
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
        <IconSparkles size={30} />
        Practice
      </h1>
      <p className="mt-2 text-sm text-neutral-500 sm:text-base">
        Drill the words you&apos;ve saved — weakest first. Each answer updates that word&apos;s
        mastery.
      </p>

      {error && <p className="glass mt-8 rounded-3xl p-8 text-sm text-neutral-500">{error}</p>}

      {!error && items === null && (
        <div className="glass mt-8 space-y-3 rounded-3xl p-8">
          <div className="shimmer h-5 w-40 rounded-full" />
          <div className="shimmer h-4 w-full rounded-full" />
          <div className="shimmer h-4 w-2/3 rounded-full" />
        </div>
      )}

      {items !== null && total === 0 && (
        <div className="glass mt-8 rounded-3xl p-8">
          <p className="text-lg font-bold text-neutral-950">No words to practice yet</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Open a story and tap the highlighted words — they land in your Vocabulary Bank, and
            this page drills them back to you.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Read today&apos;s stories
          </Link>
        </div>
      )}

      {items !== null && total > 0 && (
        <>
          {/* Mode picker */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {PRACTICE_MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className="glass group rounded-3xl p-5 text-left ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:bg-white/85 hover:ring-neutral-950/25"
              >
                <p className="text-base font-bold text-neutral-950">{m.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{m.hint}</p>
                <p className="mt-4 text-xs font-semibold text-neutral-950 opacity-0 transition-opacity group-hover:opacity-100">
                  Start round →
                </p>
              </button>
            ))}
          </div>

          {/* What's queued up */}
          <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-950">
                <IconBook size={17} /> Up next
              </h2>
              <Link
                href="/vocabulary"
                className="text-xs font-medium text-neutral-400 underline-offset-4 transition-colors hover:text-neutral-950 hover:underline"
              >
                All {total} words →
              </Link>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              The next round drills these {Math.min(total, 10)} — the ones you know least well.
            </p>
            <ul className="mt-4 space-y-2">
              {weakest.slice(0, 10).map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
                    {item.word}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {[0, 1, 2, 3, 4].map((pip) => (
                      <span
                        key={pip}
                        className={`h-1.5 w-4 rounded-full ${
                          pip < item.mastery ? "bg-emerald-500" : "bg-neutral-950/10"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="w-20 shrink-0 text-right text-[10px] text-neutral-400">
                    {item.review_count === 0
                      ? "new"
                      : `${item.review_count} review${item.review_count === 1 ? "" : "s"}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {mode && items && items.length > 0 && (
        <PracticeSession
          items={items}
          mode={mode}
          onClose={() => setMode(null)}
          onReviewed={recordReview}
        />
      )}
    </div>
  );
}
