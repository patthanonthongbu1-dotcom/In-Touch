"use client";

import { useMemo, useState } from "react";
import type { VocabEntry } from "@/lib/types";

interface ReaderProps {
  articleId: string;
  headline: string;
  summary: string;
  vocabulary: VocabEntry[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Segment = { text: string; entry?: VocabEntry };

function segmentSummary(summary: string, vocabulary: VocabEntry[]): Segment[] {
  if (vocabulary.length === 0) return [{ text: summary }];

  // Longest-first so phrases win over single words they contain.
  const words = [...vocabulary].sort((a, b) => b.word.length - a.word.length);
  const byLower = new Map(words.map((v) => [v.word.toLowerCase(), v]));
  const pattern = new RegExp(
    `\\b(${words.map((v) => escapeRegExp(v.word)).join("|")})\\b`,
    "gi"
  );

  const segments: Segment[] = [];
  let last = 0;
  for (const match of summary.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: summary.slice(last, index) });
    segments.push({ text: match[0], entry: byLower.get(match[0].toLowerCase()) });
    last = index + match[0].length;
  }
  if (last < summary.length) segments.push({ text: summary.slice(last) });
  return segments;
}

export default function Reader({ articleId, headline, summary, vocabulary }: ReaderProps) {
  const segments = useMemo(() => segmentSummary(summary, vocabulary), [summary, vocabulary]);
  const [selected, setSelected] = useState<VocabEntry | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleWordClick(entry: VocabEntry) {
    setSelected(entry);
    const key = entry.word.toLowerCase();
    if (savedWords.has(key)) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    try {
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: entry.word,
          card: entry,
          articleId,
          articleHeadline: headline,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedWords((prev) => new Set(prev).add(key));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div>
      <p className="mt-6 text-lg leading-8 text-neutral-800">
        {segments.map((segment, i) =>
          segment.entry ? (
            <button
              key={i}
              type="button"
              onClick={() => handleWordClick(segment.entry!)}
              className={`rounded-md px-0.5 font-medium underline decoration-2 underline-offset-4 transition-all duration-200 ${
                selected?.word === segment.entry.word
                  ? "bg-emerald-100 text-emerald-900 decoration-emerald-500 shadow-sm"
                  : "decoration-emerald-300 hover:bg-emerald-50 hover:decoration-emerald-500"
              }`}
            >
              {segment.text}
            </button>
          ) : (
            <span key={i}>{segment.text}</span>
          )
        )}
      </p>

      {vocabulary.length > 0 && !selected && (
        <p className="mt-4 text-xs text-neutral-400">
          💡 Tap a <span className="underline decoration-emerald-400 decoration-2 underline-offset-2">highlighted</span> word
          to see its meaning — it&apos;s saved to your vocabulary bank automatically.
        </p>
      )}

      {selected && (
        <div className="mt-6 rounded-3xl border border-emerald-200/80 bg-emerald-50/70 p-5 shadow-[0_16px_40px_-24px_rgb(5_150_105/0.45)] backdrop-blur-md sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">
                {selected.word}{" "}
                <span className="text-sm font-normal text-neutral-500">
                  {selected.pronunciation} · {selected.partOfSpeech} ·{" "}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {selected.cefr}
                  </span>
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-neutral-500">
                {saveState === "saving" && "Saving…"}
                {saveState === "saved" && "✓ In your vocab bank"}
                {saveState === "error" && "⚠️ Couldn't save"}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>
          </div>

          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="font-semibold">Meaning</dt>
              <dd>{selected.meaning}</dd>
            </div>
            {selected.thai && (
              <div>
                <dt className="font-semibold">Thai</dt>
                <dd>{selected.thai}</dd>
              </div>
            )}
            <div>
              <dt className="font-semibold">Example</dt>
              <dd className="italic">&ldquo;{selected.example}&rdquo;</dd>
            </div>
            {selected.synonyms.length > 0 && (
              <div>
                <dt className="font-semibold">Synonyms</dt>
                <dd>{selected.synonyms.join(", ")}</dd>
              </div>
            )}
            {selected.collocations.length > 0 && (
              <div>
                <dt className="font-semibold">Common collocations</dt>
                <dd>{selected.collocations.join(" · ")}</dd>
              </div>
            )}
            {selected.whyUseful && (
              <div>
                <dt className="font-semibold">Why learn this word</dt>
                <dd>{selected.whyUseful}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
