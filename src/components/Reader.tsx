"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { VocabEntry } from "@/lib/types";
import { IconChevronDown, IconX } from "@/components/icons";
import VocabCardBody from "@/components/VocabCardBody";

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
  const [clickedWords, setClickedWords] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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
    // Position in page coordinates and render through a portal on <body>,
    // so no ancestor's overflow clipping can cut the toolbox off.
    const rect = e.currentTarget.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(360, window.innerWidth - margin * 2);
    const wordCenter = rect.left + rect.width / 2 + window.scrollX;
    const left = Math.max(
      window.scrollX + margin,
      Math.min(wordCenter - width / 2, window.scrollX + window.innerWidth - width - margin)
    );
    setAnchor({
      top: rect.bottom + window.scrollY + 10,
      left,
      width,
      arrow: Math.max(20, Math.min(wordCenter - left, width - 20)),
    });
    setSelected(entry);
    setExpanded(false);

    const key = entry.word.toLowerCase();
    setClickedWords((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
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
    <div>
      <p className="mt-6 text-lg leading-8 text-neutral-800">
        {segments.map((segment, i) =>
          segment.entry ? (
            <button
              key={i}
              type="button"
              data-vocab-word
              onClick={(e) => handleWordClick(segment.entry!, e)}
              className={`rounded-md px-0.5 font-medium underline decoration-emerald-400 decoration-2 underline-offset-4 ring-neutral-950 transition-all duration-150 ${
                selected?.word === segment.entry.word
                  ? "bg-white ring-1"
                  : "hover:ring-1 hover:ring-neutral-950/30"
              }`}
            >
              {segment.text}
            </button>
          ) : (
            <span key={i}>{segment.text}</span>
          )
        )}
      </p>

      {vocabulary.length > 0 && (
        <p className="mt-4 text-xs text-neutral-400">
          💡 Tap a{" "}
          <span className="underline decoration-emerald-400 decoration-2 underline-offset-2">
            highlighted
          </span>{" "}
          word to open its toolbox — it&apos;s saved to your vocabulary bank automatically.
        </p>
      )}

      {/* Floating word-exploration counter: fills clockwise as vocab words are tapped */}
      {mounted &&
        vocabulary.length > 0 &&
        createPortal(
          (() => {
            const total = vocabulary.length;
            const clicked = Math.min(clickedWords.size, total);
            const done = clicked === total;
            const radius = 26;
            const circumference = 2 * Math.PI * radius;
            return (
              <div
                title={
                  done
                    ? "All words explored — great reading!"
                    : `${clicked} of ${total} highlighted words explored`
                }
                className="fixed bottom-5 right-5 z-30 select-none"
              >
                <div
                  className={`relative h-16 w-16 rounded-full shadow-lg transition-transform duration-300 ${
                    done ? "scale-110" : ""
                  }`}
                >
                  <svg width="64" height="64" viewBox="0 0 64 64" className="block">
                    <circle cx="32" cy="32" r={radius} fill="rgb(255 255 255 / 0.92)" />
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      fill="none"
                      stroke="rgb(10 10 10 / 0.12)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      fill="none"
                      stroke={done ? "#059669" : "#0a0a0a"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - clicked / total)}
                      transform="rotate(-90 32 32)"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                      done ? "text-emerald-600" : "text-neutral-950"
                    }`}
                  >
                    {done ? "🎉" : `${clicked}/${total}`}
                  </span>
                </div>
              </div>
            );
          })(),
          document.body
        )}

      {selected &&
        anchor &&
        createPortal(
        <>
        {/* On phones the toolbox is the main focus: dim everything behind it */}
        <div className="animate-fade-in fixed inset-0 z-40 bg-neutral-950/55 backdrop-blur-[2px] sm:hidden" />
        <div
          ref={popoverRef}
          key={selected.word}
          style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
          className="animate-pop-in glass-solid absolute z-50 rounded-3xl p-5 max-sm:fixed! max-sm:inset-x-3! max-sm:top-auto! max-sm:bottom-4! max-sm:w-auto! max-sm:p-6! max-sm:shadow-2xl"
        >
          {/* Arrow pointing at the tapped word */}
          <span
            style={{ left: anchor.arrow }}
            className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] border-l border-t border-white bg-white max-sm:hidden"
          />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-950 sm:text-4xl">
                {selected.word}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
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

          <div className="mt-4">
            <VocabCardBody entry={selected} expanded={expanded} />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-neutral-200/80 bg-white/70 py-2 text-xs font-semibold text-neutral-500 transition-all duration-150 hover:border-neutral-950 hover:text-neutral-950"
          >
            {expanded ? "Show less" : "Example, synonyms & more"}
            <IconChevronDown
              size={13}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}
