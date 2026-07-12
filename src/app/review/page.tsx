"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { saveSettings, useSettings } from "@/lib/settings";
import { useUser } from "@/lib/use-user";
import { IconCheck, IconSparkles, IconX } from "@/components/icons";

const BANDS = ["A2", "B1", "B2", "C1", "C2"] as const;
const PASS_RATIO = 0.66;

interface QuizQuestion {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  cefr: string;
  choices: string[];
  correctIndex: number;
}

interface Answer {
  cefr: string;
  correct: boolean;
}

function estimateLevel(answers: Answer[]): string {
  let estimate = "A2";
  for (const band of BANDS) {
    const inBand = answers.filter((a) => a.cefr === band);
    if (inBand.length === 0) continue;
    const accuracy = inBand.filter((a) => a.correct).length / inBand.length;
    if (accuracy >= PASS_RATIO) estimate = band;
    else break; // the ladder stops at the first band you can't hold
  }
  return estimate;
}

export default function ReviewTestPage() {
  const settings = useSettings();
  const { user } = useUser();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/review-quiz")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't build the test");
        return data;
      })
      .then((data) => !cancelled && setQuestions(data.questions))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  const finished = questions !== null && started && index >= questions.length;
  const level = useMemo(() => (finished ? estimateLevel(answers) : null), [finished, answers]);

  // Persist the result once — AccountSync carries it to the account when signed in.
  useEffect(() => {
    if (!level || saved) return;
    saveSettings({ ...settings, cefrLevel: level, cefrTestedAt: new Date().toISOString() });
    setSaved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, saved]);

  function pick(choice: number) {
    if (picked !== null || !questions) return;
    const question = questions[index];
    setPicked(choice);
    setAnswers((prev) => [...prev, { cefr: question.cefr, correct: choice === question.correctIndex }]);
    setTimeout(() => {
      setPicked(null);
      setIndex((i) => i + 1);
    }, 1100);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-12">
      <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
        <IconSparkles size={30} />
        Level test
      </h1>
      <p className="mt-2 text-sm text-neutral-500 sm:text-base">
        A few quick word questions to estimate your CEFR reading level.
      </p>

      {error && (
        <p className="glass mt-8 rounded-3xl p-8 text-sm text-neutral-500">{error}</p>
      )}

      {!error && questions === null && (
        <div className="glass mt-8 space-y-3 rounded-3xl p-8">
          <div className="shimmer h-5 w-40 rounded-full" />
          <div className="shimmer h-4 w-full rounded-full" />
          <div className="shimmer h-4 w-2/3 rounded-full" />
        </div>
      )}

      {questions && !started && (
        <div className="glass mt-8 rounded-3xl p-8">
          <p className="text-lg font-bold text-neutral-950">How it works</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-600">
            <li>• {questions.length} words from recent news, from easier to harder.</li>
            <li>• Pick the correct meaning — no time limit, no penalty for guessing.</li>
            <li>• Your estimated level is saved to your profile{user ? "" : " on this device"}.</li>
          </ul>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-6 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Start the test
          </button>
        </div>
      )}

      {questions && started && !finished && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between text-xs font-medium">
            <span className="uppercase tracking-wider text-neutral-400">
              Question {index + 1} of {questions.length}
            </span>
            <span className="text-neutral-500">
              {answers.filter((a) => a.correct).length} correct so far
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-950/10">
            <div
              className="h-full rounded-full bg-neutral-950 transition-all duration-500 ease-out"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>

          <div key={index} className="animate-card-in glass mt-5 rounded-3xl p-6 sm:p-8">
            <p className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
              {questions[index].word}
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              {questions[index].pronunciation} · {questions[index].partOfSpeech}
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              What does it mean?
            </p>
            <div className="mt-2.5 space-y-2.5">
              {questions[index].choices.map((choice, i) => {
                const isCorrect = i === questions[index].correctIndex;
                const revealed = picked !== null;
                const style = !revealed
                  ? "bg-white/70 ring-1 ring-neutral-200/70 hover:-translate-y-0.5 hover:bg-white hover:ring-neutral-950/40"
                  : isCorrect
                    ? "bg-emerald-600 text-white ring-1 ring-emerald-600"
                    : i === picked
                      ? "bg-rose-500 text-white ring-1 ring-rose-500"
                      : "bg-white/40 text-neutral-400 ring-1 ring-neutral-200/50";
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={revealed}
                    onClick={() => pick(i)}
                    className={`flex w-full items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-medium leading-relaxed transition-all duration-200 ${style}`}
                  >
                    {revealed && isCorrect && <IconCheck size={15} className="mt-0.5 shrink-0" />}
                    {revealed && !isCorrect && i === picked && (
                      <IconX size={15} className="mt-0.5 shrink-0" />
                    )}
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {finished && level && (
        <div className="animate-card-in glass mt-8 rounded-3xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Your estimated level
          </p>
          <p className="mt-2 text-6xl font-extrabold tracking-tight text-neutral-950">{level}</p>
          <p className="mt-2 text-sm text-neutral-500">
            {answers.filter((a) => a.correct).length} of {answers.length} correct · saved to your
            profile{user ? "" : " on this device"}
          </p>

          <div className="mx-auto mt-6 max-w-sm space-y-2 text-left">
            {BANDS.map((band) => {
              const inBand = answers.filter((a) => a.cefr === band);
              if (inBand.length === 0) return null;
              const correct = inBand.filter((a) => a.correct).length;
              return (
                <div key={band} className="flex items-center gap-3">
                  <span className="w-8 text-xs font-bold text-neutral-950">{band}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-950/10">
                    <div
                      className="h-full rounded-full bg-neutral-950 transition-all duration-700 ease-out"
                      style={{ width: `${(correct / inBand.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-neutral-500">
                    {correct}/{inBand.length}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStarted(false);
                setIndex(0);
                setAnswers([]);
                setSaved(false);
                setQuestions(null);
                fetch("/api/review-quiz")
                  .then((res) => res.json())
                  .then((data) => setQuestions(data.questions ?? null));
              }}
              className="rounded-full border border-neutral-300 bg-white/70 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-all duration-150 hover:border-neutral-950 hover:text-neutral-950"
            >
              Retake with new words
            </button>
            <Link
              href="/profile"
              className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              See it on your profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
