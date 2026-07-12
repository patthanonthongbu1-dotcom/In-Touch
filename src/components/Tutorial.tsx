"use client";

import { useState, useSyncExternalStore } from "react";
import { saveSettings, useSettings } from "@/lib/settings";

const INK = "#0a0a0a";
const ACCENT = "#059669";

/* Hand-drawn-style vignettes, one per step, in the app's stroke-icon style. */

function ArtWelcome() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-auto" fill="none" aria-hidden>
      <rect x="30" y="30" width="120" height="74" rx="12" fill="white" stroke={INK} strokeWidth="2" />
      <rect x="42" y="42" width="42" height="28" rx="6" fill={INK} opacity="0.08" />
      <path d="M94 48h44M94 58h36" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M42 82h96M42 92h72" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <rect x="140" y="16" width="60" height="42" rx="10" fill="white" stroke={INK} strokeWidth="2" />
      <path d="M150 30h40M150 40h28" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path
        d="M186 76l3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5z"
        fill={ACCENT}
        opacity="0.9"
      />
      <circle cx="22" cy="24" r="4" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

function ArtMorning() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-auto" fill="none" aria-hidden>
      <circle cx="60" cy="44" r="16" stroke={INK} strokeWidth="2" fill="#fbbf24" fillOpacity="0.25" />
      <path
        d="M60 18v8M60 62v8M34 44h8M78 44h8M42 26l5.5 5.5M78 26l-5.5 5.5"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="104" y="26" width="88" height="30" rx="9" fill="white" stroke={INK} strokeWidth="2" />
      <rect x="104" y="64" width="88" height="30" rx="9" fill="white" stroke={INK} strokeWidth="2" />
      <path d="M116 38h40M116 46h28" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M116 76h40M116 84h28" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <rect x="168" y="32" width="18" height="10" rx="5" fill={INK} />
      <text x="47" y="98" fontSize="13" fontWeight="700" fill={INK} fontFamily="inherit">
        5:00
      </text>
      <path d="M30 92h6" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function ArtWords() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-auto" fill="none" aria-hidden>
      <path d="M24 96h80M24 106h56" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <path d="M24 84h28" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <text x="58" y="88" fontSize="14" fontWeight="700" fill={INK} fontFamily="inherit">
        evacuate
      </text>
      <path d="M58 92h62" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
      <rect x="52" y="14" width="140" height="52" rx="12" fill="white" stroke={INK} strokeWidth="2" />
      <path d="M104 70l8-8h-16z" fill="white" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="62" y="24" width="66" height="12" rx="6" fill={INK} />
      <path d="M62 46h96M62 54h72" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path
        d="M140 96c0-6 4-8 6-4l2 5 2-9c1-4 5-4 6 0l1 6 2-4c1.5-3 5-2 5 1v8c0 6-5 11-12 11s-12-6-12-14z"
        fill="#fde68a"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArtStreak() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-auto" fill="none" aria-hidden>
      <path
        d="M110 14c3 10-8 14-8 24 0 7 5 12 8 12-8 2-20-3-20-18 0 6-6 8-6 16 0 14 12 22 26 22s26-9 26-23c0-10-7-14-10-22-2 6-6 7-8 5 3-5 0-12-8-16z"
        fill="#fb923c"
        fillOpacity="0.3"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect
            x={26 + i * 25}
            y={82}
            width="20"
            height="20"
            rx="6"
            fill={i < 4 ? INK : "white"}
            stroke={INK}
            strokeWidth="2"
          />
          {i < 4 && (
            <path
              d={`M${31 + i * 25} 92l4 4 6-8`}
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

function ArtLevel() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-auto" fill="none" aria-hidden>
      {["A2", "B1", "B2", "C1", "C2"].map((band, i) => (
        <g key={band}>
          <rect
            x={22 + i * 37}
            y={86 - i * 15}
            width="30"
            height={18 + i * 15}
            rx="7"
            fill={i <= 2 ? INK : "white"}
            fillOpacity={i <= 2 ? 0.9 : 1}
            stroke={INK}
            strokeWidth="2"
          />
          <text
            x={37 + i * 37}
            y={80 - i * 15}
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            fill={i <= 2 ? "white" : INK}
            fontFamily="inherit"
          >
            {band}
          </text>
        </g>
      ))}
      <path
        d="M96 30l4 9 9 4-9 4-4 9-4-9-9-4 9-4z"
        fill={ACCENT}
        opacity="0.9"
        transform="translate(4 -14)"
      />
    </svg>
  );
}

const STEPS = [
  {
    art: <ArtWelcome />,
    title: "Welcome to InTouch",
    body: "Your daily news, curated by AI and designed to grow your English while you stay informed.",
  },
  {
    art: <ArtMorning />,
    title: "A fresh report every morning",
    body: "Around 5:00 (Bangkok time) the day's most important stories arrive, summarized in learner-friendly English. Older days live in the Archive.",
  },
  {
    art: <ArtWords />,
    title: "Tap words to learn them",
    body: "Underlined words open a toolbox — meaning, Thai, examples, synonyms — and save to your Vocabulary Bank automatically. The counter in the corner tracks each story's words.",
  },
  {
    art: <ArtStreak />,
    title: "Keep your streak alive",
    body: "Mark at least one story as done every day and your streak grows — see it on your profile, along with everything you've read and saved.",
  },
  {
    art: <ArtLevel />,
    title: "Find your level",
    body: "Take the quick level test to estimate your CEFR reading level, then filter stories to match. Retake it any time from your profile as you improve.",
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
        {current.art}
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-neutral-950">
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
