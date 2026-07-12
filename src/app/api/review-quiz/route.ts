import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { VocabEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const BANDS = ["A2", "B1", "B2", "C1", "C2"] as const;
const PER_BAND = 3;
const CHOICES = 4;

export interface QuizQuestion {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  cefr: string;
  choices: string[];
  correctIndex: number;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// GET /api/review-quiz — a fresh level test built from recent article vocabulary
export async function GET() {
  const { data, error } = await supabase()
    .from("articles")
    .select("vocabulary")
    .order("published_date", { ascending: false })
    .limit(80);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten and dedupe the vocabulary pool.
  const byWord = new Map<string, VocabEntry>();
  for (const row of data ?? []) {
    for (const entry of (row.vocabulary ?? []) as VocabEntry[]) {
      const key = entry.word.toLowerCase();
      if (!byWord.has(key) && entry.meaning && entry.cefr) byWord.set(key, entry);
    }
  }
  const pool = [...byWord.values()];
  if (pool.length < CHOICES * 2) {
    return NextResponse.json(
      { error: "Not enough vocabulary yet — check back after a few daily reports." },
      { status: 503 }
    );
  }

  const questions: QuizQuestion[] = [];
  for (const band of BANDS) {
    const bandWords = shuffle(pool.filter((e) => e.cefr === band)).slice(0, PER_BAND);
    for (const entry of bandWords) {
      const distractors = shuffle(
        pool.filter((e) => e.word !== entry.word && e.meaning !== entry.meaning)
      )
        // Prefer same-band meanings so choices feel comparable.
        .sort((a, b) => Number(b.cefr === band) - Number(a.cefr === band))
        .slice(0, CHOICES - 1)
        .map((e) => e.meaning);
      const choices = shuffle([entry.meaning, ...distractors]);
      questions.push({
        word: entry.word,
        pronunciation: entry.pronunciation,
        partOfSpeech: entry.partOfSpeech,
        cefr: entry.cefr,
        choices,
        correctIndex: choices.indexOf(entry.meaning),
      });
    }
  }

  return NextResponse.json({ questions });
}
