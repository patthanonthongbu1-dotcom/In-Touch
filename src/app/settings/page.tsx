"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_META, type Category } from "@/lib/types";
import { saveSettings, useSettings } from "@/lib/settings";

export default function SettingsPage() {
  const settings = useSettings();
  const [pipelineState, setPipelineState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [pipelineMessage, setPipelineMessage] = useState("");

  function toggleCategory(category: Category) {
    const hidden = settings.hiddenCategories.includes(category)
      ? settings.hiddenCategories.filter((c) => c !== category)
      : [...settings.hiddenCategories, category];
    saveSettings({ ...settings, hiddenCategories: hidden });
  }

  async function runPipeline() {
    if (!settings.pipelineSecret) {
      setPipelineState("error");
      setPipelineMessage("Enter your pipeline secret first.");
      return;
    }
    setPipelineState("running");
    setPipelineMessage("Fetching, curating, and summarizing today's news — this takes a few minutes. Keep this tab open.");
    try {
      const res = await fetch(`/api/pipeline?secret=${encodeURIComponent(settings.pipelineSecret)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPipelineState("done");
      setPipelineMessage(`✓ Published ${data.published} stories for ${data.date}. Head to Today and hit Refresh!`);
    } catch (e) {
      setPipelineState("error");
      setPipelineMessage(e instanceof Error ? e.message : "The pipeline failed — try again later.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
        ⚙️ Settings
      </h1>
      <p className="mt-2 text-sm text-neutral-500 sm:text-base">
        Shape your daily report. Everything here is saved on this device.
      </p>

      <section className="glass mt-8 rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-neutral-950">🗂 Categories on your feed</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tap to show or hide a category on the Today page.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const visible = !settings.hiddenCategories.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={visible}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  visible
                    ? "bg-neutral-950 text-white shadow-lg shadow-neutral-950/20"
                    : "border border-dashed border-neutral-300 bg-white/50 text-neutral-400 hover:border-neutral-500 hover:text-neutral-600"
                }`}
              >
                {meta.emoji} {meta.label} {visible ? "✓" : ""}
              </button>
            );
          })}
        </div>
        {settings.hiddenCategories.length > 0 && (
          <p className="mt-4 text-xs text-neutral-400">
            {settings.hiddenCategories.length} categor
            {settings.hiddenCategories.length === 1 ? "y" : "ies"} hidden from your feed.
          </p>
        )}
      </section>

      <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-neutral-950">🔄 Fresh news</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">
          Your report refreshes automatically every morning around 5:00 (Bangkok time). You can also
          run it manually with your pipeline secret — note the free AI quota covers about one full
          run per day.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            type="password"
            value={settings.pipelineSecret}
            onChange={(e) => saveSettings({ ...settings, pipelineSecret: e.target.value })}
            placeholder="Pipeline secret…"
            className="glass w-full max-w-xs rounded-full px-4 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-400 focus:bg-white focus:shadow-lg"
          />
          <button
            type="button"
            onClick={runPipeline}
            disabled={pipelineState === "running"}
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pipelineState === "running" ? "Finding news…" : "Find more news"}
          </button>
        </div>
        {pipelineMessage && (
          <p
            className={`mt-4 text-sm ${
              pipelineState === "error"
                ? "text-red-600"
                : pipelineState === "done"
                  ? "font-medium text-emerald-700"
                  : "text-neutral-500"
            }`}
          >
            {pipelineMessage}
          </p>
        )}
      </section>

      <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-neutral-950">👋 New here?</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Replay the quick intro tour whenever you like.
        </p>
        <button
          type="button"
          onClick={() => saveSettings({ ...settings, tutorialDone: false })}
          className="mt-4 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800"
        >
          Show tutorial again
        </button>
      </section>
    </div>
  );
}
