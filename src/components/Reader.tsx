"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VocabEntry } from "@/lib/types";
import { IconX } from "@/components/icons";

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

interface Anchor {
  top: number;
  left: number;
  width: number;
  arrow: number;
}

export default function Reader({ articleId, headline, summary, vocabulary }: ReaderProps) {
  const segments = useMemo(() => segmentSummary(summary, vocabulary), [summary, vocabulary]);
  const [selected, setSelected] = useState<VocabEntry | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest("[data-vocab-word]")) return;
      setSelected(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  function handleWordClick(entry: VocabEntry, e: React.MouseEvent<HTMLButtonElement>) {
    const button = e.currentTarget;
    const containerWidth = containerRef.current?.clientWidth ?? 360;
    const width = Math.min(360, containerWidth);
    const wordCenter = button.offsetLeft + button.offsetWidth / 2;
    const left = Math.max(0, Math.min(wordCenter - width / 2, containerWidth - width));
    setAnchor({
      top: button.offsetTop + button.offsetHeight + 10,
      left,
      width,
      arrow: Math.max(20, Math.min(wordCenter - left, width - 20)),
    });
    setSelected(entry);

    const key = entry.word.toLowerCase();
    if (savedWords.has(key)) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    fetch("/api/vocab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: entry.word,
        card: entry,
        articleId,
        articleHeadline: headline,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("save failed");
        setSavedWords((prev) => new Set(prev).add(key));
        setSaveState("saved");
      })
      .catch(() => setSaveState("error"));
  }

  return (
    <div ref={containerRef} className="relative">
      <p className="mt-6 text-lg leading-8 text-neutral-800">
        {segments.map((segment, i) =>
          segment.entry ? (
            <button
              key={i}
              type="button"
              data-vocab-word
              onClick={(e) => handleWordClick(segment.entry!, e)}
              className={`rounded-md px-0.5 font-medium underline decoration-2 underline-offset-4 transition-colors duration-150 ${
                selected?.word === segment.entry.word
                  ? "bg-neutral-950 text-white decoration-neutral-950"
                  : "decoration-emerald-400 hover:bg-emerald-50 hover:decoration-emerald-600"
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
          💡 Tap a{" "}
          <span className="underline decoration-emerald-400 decoration-2 underline-offset-2">
            highlighted
          </span>{" "}
          word to open its toolbox — it&apos;s saved to your vocabulary bank automatically.
        </p>
      )}

      {selected && anchor && (
        <div
          ref={popoverRef}
          key={selected.word}
          style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
          className="animate-pop-in glass-strong absolute z-30 rounded-3xl p-5 max-sm:fixed! max-sm:inset-x-3! max-sm:top-auto! max-sm:bottom-3! max-sm:w-auto!"
        >
          {/* Arrow pointing at the tapped word */}
          <span
            style={{ left: anchor.arrow }}
            className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] border-l border-t border-white/90 bg-white/90 max-sm:hidden"
          />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-tight tracking-tight text-neutral-950">
                {selected.word}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                <span>{selected.pronunciation}</span>
                <span>·</span>
                <span>{selected.partOfSpeech}</span>
                <span className="rounded-full border border-neutral-950 px-2 py-0.5 text-[10px] font-bold text-neutral-950">
                  {selected.cefr}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] text-neutral-400">
                {saveState === "saving" && "Saving…"}
                {saveState === "saved" && "✓ Saved"}
                {saveState === "error" && "⚠ Not saved"}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-full p-1.5 text-neutral-400 transition-colors duration-150 hover:bg-white hover:text-neutral-950"
              >
                <IconX size={14} />
              </button>
            </div>
          </div>

          <p className="mt-3 text-[15px] font-medium leading-relaxed text-neutral-900">
            {selected.meaning}
          </p>

          {selected.thai && (
            <p className="mt-2 rounded-xl bg-neutral-950 px-3 py-2 text-sm font-medium text-white">
              🇹🇭 {selected.thai}
            </p>
          )}

          <p className="mt-3 border-l-2 border-emerald-400 pl-3 text-sm italic leading-relaxed text-neutral-600">
            &ldquo;{selected.example}&rdquo;
          </p>

          {selected.synonyms.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {selected.synonyms.map((synonym) => (
                <span
                  key={synonym}
                  className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200/70"
                >
                  {synonym}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
