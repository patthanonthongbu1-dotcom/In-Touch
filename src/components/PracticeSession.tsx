"use client";

import { useState } from "react";
import type { VocabBankItem } from "@/lib/types";
import { IconCheck, IconStar, IconX } from "@/components/icons";

export type PracticeMode = "meaning" | "thai" | "recall";

export const PRACTICE_MODES: { key: PracticeMode; label: string; hint: string }[] = [
  { key: "meaning", label: "Multiple choice", hint: "Pick the meaning of the word" },
  { key: "thai", label: "Thai → English", hint: "Pick the English word for a Thai meaning" },
  { key: "recall", label: "Flashcards", hint: "Recall it yourself, then reveal" },
];

const SESSION_SIZE = 10;
const CHOICES = 4;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Weakest words first: low mastery, then least reviewed. Ties broken randomly
 * so repeat sessions don't drill the exact same list.
 */
function pickWords(items: VocabBankItem[], size: number): VocabBankItem[] {
  return shuffle(items)
    .sort((a, b) => a.mastery - b.mastery || a.review_count - b.review_count)
    .slice(0, size);
}

export default function PracticeSession({
  items,
  mode,
  onClose,
  onReviewed,
}: {
  items: VocabBankItem[];
  mode: PracticeMode;
  onClose: () => void;
  onReviewed: (id: string, correct: boolean) => void;
}) {
  // Built once, at session start: scoring updates the caller's items, and
  // rebuilding from those would reshuffle the round mid-flight.
  const [questions] = useState(() =>
    pickWords(items, SESSION_SIZE).map((item) => {
      // Distractors come from the rest of the bank, so choices feel plausible.
      const others = shuffle(items.filter((i) => i.id !== item.id)).slice(0, CHOICES - 1);
      return { item, options: shuffle([item, ...others]) };
    })
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);

  const current = questions[index];
  const finished = index >= questions.length;
  const correctCount = results.filter((r) => r.correct).length;

  function score(correct: boolean) {
    if (!current) return;
    onReviewed(current.item.id, correct);
    setResults((prev) => [...prev, { id: current.item.id, correct }]);
    setPicked(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function choose(item: VocabBankItem) {
    if (picked || !current) return;
    setPicked(item.id);
    const correct = item.id === current.item.id;
    setTimeout(() => score(correct), 1000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-sm">
      <div className="glass-solid w-full max-w-lg rounded-3xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {finished
                ? "Session complete"
                : `${PRACTICE_MODES.find((m) => m.key === mode)?.label} · ${index + 1} of ${questions.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close practice"
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-white hover:text-neutral-950"
          >
            <IconX size={16} />
          </button>
        </div>

        {!finished && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-950/10">
            <div
              className="h-full rounded-full bg-neutral-950 transition-all duration-500 ease-out"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>
        )}

        {/* Question */}
        {!finished && current && (
          <div key={index} className="animate-card-in mt-6">
            {mode === "thai" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Which word means this?
                </p>
                <p className="mt-2 text-2xl font-bold leading-snug tracking-tight text-neutral-950">
                  {current.item.card.thai || current.item.card.meaning}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
                  {current.item.word}
                </p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {current.item.card.pronunciation} · {current.item.card.partOfSpeech}
                </p>
              </>
            )}

            {/* Multiple choice */}
            {mode !== "recall" && (
              <div className="mt-5 space-y-2.5">
                {current.options.map((option) => {
                  const isAnswer = option.id === current.item.id;
                  const style = !picked
                    ? "bg-white/70 ring-1 ring-neutral-200/70 hover:-translate-y-0.5 hover:bg-white hover:ring-neutral-950/40"
                    : isAnswer
                      ? "bg-emerald-600 text-white ring-1 ring-emerald-600"
                      : option.id === picked
                        ? "bg-rose-500 text-white ring-1 ring-rose-500"
                        : "bg-white/40 text-neutral-400 ring-1 ring-neutral-200/50";
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={Boolean(picked)}
                      onClick={() => choose(option)}
                      className={`flex w-full items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-medium leading-relaxed transition-all duration-200 ${style}`}
                    >
                      {picked && isAnswer && <IconCheck size={15} className="mt-0.5 shrink-0" />}
                      {picked && !isAnswer && option.id === picked && (
                        <IconX size={15} className="mt-0.5 shrink-0" />
                      )}
                      {mode === "thai" ? option.word : option.card.meaning}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Flashcard recall */}
            {mode === "recall" && (
              <div className="mt-5">
                {!revealed ? (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="w-full rounded-2xl border border-dashed border-neutral-300 bg-white/50 py-10 text-sm font-medium text-neutral-400 transition-all hover:border-neutral-950 hover:text-neutral-950"
                  >
                    Think of the meaning — tap to reveal
                  </button>
                ) : (
                  <div className="animate-fade-in rounded-2xl bg-neutral-950 px-4 py-4">
                    <p className="text-[15px] font-medium leading-relaxed text-white">
                      {current.item.card.meaning}
                    </p>
                    {current.item.card.thai && (
                      <p className="mt-2 text-sm text-white/70">{current.item.card.thai}</p>
                    )}
                  </div>
                )}

                {revealed && (
                  <div className="mt-4 flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => score(false)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-rose-300 bg-white/60 py-3 text-sm font-semibold text-rose-600 transition-all hover:-translate-y-0.5 hover:bg-rose-50"
                    >
                      <IconX size={14} /> Didn&apos;t know
                    </button>
                    <button
                      type="button"
                      onClick={() => score(true)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
                    >
                      <IconCheck size={14} /> Knew it
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* A hint of the source, once answered */}
            {(picked || revealed) && current.item.card.example && (
              <p className="mt-4 border-l-2 border-emerald-400 pl-3 text-xs italic leading-relaxed text-neutral-500">
                &ldquo;{current.item.card.example}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Result */}
        {finished && (
          <div className="animate-card-in mt-6 text-center">
            <p className="text-6xl font-extrabold tracking-tight text-neutral-950">
              {correctCount}
              <span className="text-2xl text-neutral-400">/{results.length}</span>
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              {correctCount === results.length
                ? "Perfect round — those words are sticking."
                : correctCount >= results.length / 2
                  ? "Good work. The ones you missed will come back sooner."
                  : "Tough round — these words are now first in line next time."}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-neutral-950 bg-transparent px-5 py-2.5 text-sm font-semibold text-neutral-950 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Live score */}
        {!finished && results.length > 0 && (
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
            <IconStar size={11} filled /> {correctCount} of {results.length} correct so far
          </p>
        )}
      </div>
    </div>
  );
}
