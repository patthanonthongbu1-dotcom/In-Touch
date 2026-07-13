"use client";

import { useSyncExternalStore } from "react";
import type { Category } from "./types";

export interface AppSettings {
  hiddenCategories: Category[];
  pipelineSecret: string;
  tutorialDone: boolean;
  readArticles: string[];
  cefrLevel: string | null; // estimated by the level test
  cefrTestedAt: string | null;
  // Read by the nightly pipeline, not just the UI: how many Thailand stories
  // tomorrow's report should aim for.
  thaiStoriesPerDay: number;
  defaultSort: "latest" | "top";
  defaultLevels: string[]; // CEFR filter Today starts with; empty = show all
  quickReadsOnly: boolean;
}

export const THAI_PER_DAY_MIN = 3;
export const THAI_PER_DAY_MAX = 8;

export const DEFAULT_SETTINGS: AppSettings = {
  hiddenCategories: [],
  pipelineSecret: "",
  tutorialDone: false,
  readArticles: [],
  cefrLevel: null,
  cefrTestedAt: null,
  thaiStoriesPerDay: 6,
  defaultSort: "latest",
  defaultLevels: [],
  quickReadsOnly: false,
};

const STORAGE_KEY = "intouch-settings";
const CHANGE_EVENT = "intouch-settings-changed";

// Cache keyed on the raw JSON so getSnapshot returns a stable reference.
let cache: { raw: string | null; value: AppSettings } | null = null;

function getSnapshot(): AppSettings {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (cache && cache.raw === raw) return cache.value;
  let value = DEFAULT_SETTINGS;
  if (raw) {
    try {
      value = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
    } catch {
      value = DEFAULT_SETTINGS;
    }
  }
  cache = { raw, value };
  return value;
}

function getServerSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function saveSettings(settings: AppSettings): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
