"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { CATEGORY_META } from "@/lib/types";

export interface ArchiveEntry {
  id: string;
  headline: string;
  category: string;
  difficulty: string;
  reading_time_min: number;
  published_date: string;
  time: string; // "14:46" — when it was added, Bangkok time
}

function formatDay(date: string, latest: boolean): string {
  const label = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return latest ? `Today — ${label}` : label;
}

export default function ArchiveList({ entries }: { entries: ArchiveEntry[] }) {
  const [query, setQuery] = useState("");

  const days = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? entries.filter((e) => e.headline.toLowerCase().includes(q))
      : entries;
    const byDay = new Map<string, ArchiveEntry[]>();
    for (const entry of filtered) {
      if (!byDay.has(entry.published_date)) byDay.set(entry.published_date, []);
      byDay.get(entry.published_date)!.push(entry);
    }
    return [...byDay.entries()];
  }, [entries, query]);

  const latestDate = entries[0]?.published_date;

  return (
    <div>
      <div className="glass mt-6 flex items-center gap-2 rounded-full px-4 py-2.5 transition-all focus-within:bg-white focus-within:shadow-lg sm:max-w-sm">
        <IconSearch size={15} className="shrink-0 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the archive…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </div>

      {days.length === 0 && (
        <p className="mt-8 text-sm text-neutral-400">
          {entries.length === 0
            ? "Nothing here yet — the archive fills up as daily reports are published."
            : "No stories match your search."}
        </p>
      )}

      {days.map(([date, rows]) => (
        <section key={date} className="mt-8">
          <h2 className="px-1 text-sm font-bold text-neutral-950">
            {formatDay(date, date === latestDate)}
            <span className="ml-2 font-normal text-neutral-400">
              {rows.length} {rows.length === 1 ? "story" : "stories"}
            </span>
          </h2>
          <div className="glass mt-2.5 rounded-3xl">
            {rows.map((row) => {
              const meta = CATEGORY_META[row.category as keyof typeof CATEGORY_META] ?? {
                emoji: "📰",
                label: row.category,
              };
              return (
                <Link
                  key={row.id}
                  href={`/article/${row.id}`}
                  transitionTypes={["nav-forward"]}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-white/85 sm:px-5"
                >
                  <span className="w-11 shrink-0 text-xs tabular-nums text-neutral-400">
                    {row.time}
                  </span>
                  <span
                    aria-hidden
                    title={meta.label}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-base ring-1 ring-neutral-200/70"
                  >
                    {meta.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800 group-hover:text-neutral-950">
                    {row.headline}
                  </span>
                  <span className="hidden shrink-0 text-xs text-neutral-400 sm:inline">
                    {row.reading_time_min} min
                  </span>
                  <span className="shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                    {row.difficulty}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
