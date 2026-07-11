"use client";

import { useState, useSyncExternalStore } from "react";
import { saveSettings, useSettings } from "@/lib/settings";

const STEPS = [
  {
    emoji: "👋",
    title: "Welcome to InTouch",
    body: "Your daily news, curated by AI and designed to grow your English while you stay informed.",
  },
  {
    emoji: "📰",
    title: "A fresh report every morning",
    body: "Around 5:00 (Bangkok time), the day's most important stories arrive — summarized in learner-friendly English, each with a CEFR reading level and reading time.",
  },
  {
    emoji: "📚",
    title: "Tap words to learn them",
    body: "Words worth learning are underlined in every article. Tap one to open its toolbox — meaning, Thai translation, example, synonyms — and it's saved to your Vocabulary Bank automatically.",
  },
  {
    emoji: "⚙️",
    title: "Make it yours",
    body: "Swipe the category bar, filter by level, and hide topics you don't care about in Settings. The Happening now bar shows live search trends from Thailand and the world.",
  },
];

// SSR-safe "has mounted" check that keeps returning users from seeing a flash.
const emptySubscribe = () => () => {};

export default function Tutorial() {
  const settings = useSettings();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [step, setStep] = useState(0);

  if (!mounted || settings.tutorialDone) return null;

  const finish = () => saveSettings({ ...settings, tutorialDone: true });
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm">
      <div
        key={step}
        className="animate-pop-in glass-solid w-full max-w-md rounded-3xl p-8 text-center"
      >
        <p className="text-5xl">{current.emoji}</p>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-neutral-950">
          {current.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{current.body}</p>

        <div className="mt-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Step ${i + 1}`}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === step ? "w-6 bg-neutral-950" : "w-2 bg-neutral-300 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="text-xs font-medium text-neutral-400 transition-colors duration-150 hover:text-neutral-950"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="glass rounded-full px-5 py-2.5 text-sm font-semibold text-neutral-600 transition-all duration-150 hover:bg-white hover:text-neutral-950"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep(step + 1))}
              className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              {isLast ? "Let's read →" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
