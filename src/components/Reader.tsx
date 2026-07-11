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
      <p className="mt-5 text-[1.05rem] leading-relaxed">
        {segments.map((segment, i) =>
          segment.entry ? (
            <button
              key={i}
              type="button"
              onClick={() => handleWordClick(segment.entry!)}
              className={`rounded px-0.5 font-medium underline decoration-2 underline-offset-2 transition ${
                selected?.word === segment.entry.word
                  ? "bg-emerald-200 decoration-emerald-600 dark:bg-emerald-900"
                  : "decoration-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950"
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
        <p className="mt-3 text-xs text-neutral-500">
          💡 Tap a <span className="underline decoration-emerald-400 decoration-2 underline-offset-2">highlighted</span> word
          to see its meaning — it&apos;s saved to your vocabulary bank automatically.
        </p>
      )}

      {selected && (
        <div className="mt-5 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">
                {selected.word}{" "}
                <span className="text-sm font-normal text-neutral-500">
                  {selected.pronunciation} · {selected.partOfSpeech} ·{" "}
                  <span className="rounded bg-white px-1 py-0.5 text-xs font-semibold dark:bg-neutral-800">
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
