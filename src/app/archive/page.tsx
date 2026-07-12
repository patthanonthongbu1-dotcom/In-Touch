import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { formatTimeBangkok } from "@/lib/dates";
import { IconArchive } from "@/components/icons";
import ArchiveList, { type ArchiveEntry } from "@/components/ArchiveList";

export const dynamic = "force-dynamic";

export const metadata = { title: "Archive — InTouch" };

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
    .select("id, headline, category, difficulty, reading_time_min, published_date, created_at")
    .order("published_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(600);
  if (error) throw new Error(error.message);

  const entries: ArchiveEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    headline: row.headline,
    category: row.category,
    difficulty: row.difficulty,
    reading_time_min: row.reading_time_min,
    published_date: row.published_date,
    time: formatTimeBangkok(row.created_at),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
        <IconArchive size={30} />
        Archive
      </h1>
      <p className="mt-2 text-sm text-neutral-500 sm:text-base">
        Every story InTouch has published, newest first — search it like your history.
      </p>

      <ArchiveList entries={entries} />
    </div>
  );
}
