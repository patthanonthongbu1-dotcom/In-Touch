import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { CATEGORY_META, type Article } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Archive — InTouch" };

const MAX_DAYS = 30;

type ArchiveRow = Pick<
  Article,
  "id" | "headline" | "category" | "difficulty" | "reading_time_min" | "published_date"
>;

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ArchivePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12">
        <p className="glass rounded-3xl p-8 text-sm text-neutral-600">Supabase isn&apos;t configured yet.</p>
      </div>
    );
  }

  const { data, error } = await supabase()
    .from("articles")
    .select("id, headline, category, difficulty, reading_time_min, published_date")
    .order("published_date", { ascending: false })
    .order("importance", { ascending: false });
  if (error) throw new Error(error.message);

  const byDay = new Map<string, ArchiveRow[]>();
  for (const row of (data ?? []) as ArchiveRow[]) {
    if (!byDay.has(row.published_date)) byDay.set(row.published_date, []);
    byDay.get(row.published_date)!.push(row);
  }

  const days = [...byDay.entries()];
  const [latest, ...pastDays] = days;
  const shownDays = pastDays.slice(0, MAX_DAYS);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
        🗄 Archive
      </h1>
      <p className="mt-2 text-sm text-neutral-500 sm:text-base">
        Every past daily report, kept for whenever you want to catch up or re-read.
        {latest && (
          <>
            {" "}
            Today&apos;s report lives on the{" "}
            <Link href="/" className="font-medium text-neutral-950 underline underline-offset-4">
              Today page
            </Link>
            .
          </>
        )}
      </p>

      {shownDays.length === 0 && (
        <p className="glass mt-8 rounded-3xl p-8 text-sm text-neutral-500">
          Nothing here yet — the archive fills up as new daily reports are published.
        </p>
      )}

      {shownDays.map(([date, rows]) => (
        <section key={date} className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-neutral-950">{formatDay(date)}</h2>
            <span className="text-xs text-neutral-400">
              {rows.length} {rows.length === 1 ? "story" : "stories"}
            </span>
          </div>
          <div className="glass mt-3 divide-y divide-neutral-200/60 rounded-3xl">
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
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-white/80"
                >
                  <span aria-hidden className="shrink-0 text-lg">
                    {meta.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800 group-hover:text-neutral-950">
                    {row.headline}
                  </span>
                  <span className="shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                    {row.difficulty}
                  </span>
                  <span className="hidden shrink-0 text-xs text-neutral-400 sm:inline">
                    {row.reading_time_min} min
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
