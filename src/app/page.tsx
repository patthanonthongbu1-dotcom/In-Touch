import { Suspense } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { type Article } from "@/lib/types";
import NewsExplorer from "@/components/NewsExplorer";
import TrendingStrip from "@/components/TrendingStrip";

export const dynamic = "force-dynamic";

async function getLatestReport(): Promise<{ date: string; articles: Article[] } | null> {
  const db = supabase();
  const { data: latest, error: dateError } = await db
    .from("articles")
    .select("published_date")
    .order("published_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dateError) throw new Error(dateError.message);
  if (!latest) return null;

  const { data, error } = await db
    .from("articles")
    .select("*")
    .eq("published_date", latest.published_date)
    .order("importance", { ascending: false });
  if (error) throw new Error(error.message);

  return { date: latest.published_date, articles: (data ?? []) as Article[] };
}

function SetupNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <div className="glass rounded-3xl p-8 text-sm text-neutral-600">
        <p className="text-lg font-semibold text-neutral-900">No news yet</p>
        <p className="mt-2">{message}</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>Create a Supabase project and run <code>supabase/schema.sql</code> (and optionally <code>seed.sql</code>).</li>
          <li>Fill in <code>.env.local</code> from <code>.env.example</code>.</li>
          <li>Run <code>npm run pipeline</code> to fetch and publish today&apos;s report.</li>
        </ol>
      </div>
    </div>
  );
}

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice message="Supabase isn't configured yet." />;
  }

  const report = await getLatestReport();
  if (!report || report.articles.length === 0) {
    return <SetupNotice message="The database is empty — run the pipeline to publish your first daily report." />;
  }

  const displayDate = new Date(`${report.date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalVocab = report.articles.reduce((sum, a) => sum + a.vocabulary.length, 0);
  const totalMinutes = report.articles.reduce((sum, a) => sum + a.reading_time_min, 0);

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pb-14 pt-16 text-center sm:pb-20 sm:pt-28">
        <p className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-600">
          📅 Daily Report <span className="text-neutral-300">|</span> {displayDate}
        </p>

        <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tighter text-neutral-950 sm:text-7xl">
          Read the world.
          <br />
          <span className="text-gradient">Grow your English.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-500 sm:text-lg">
          Today&apos;s most important stories, summarized in learner-friendly English —
          tap any highlighted word to make it yours.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-neutral-700">
          <span className="glass rounded-2xl px-5 py-3">
            📰 {report.articles.length} stories curated
          </span>
          <span className="glass rounded-2xl px-5 py-3">
            📚 {totalVocab} vocabulary words
          </span>
          <span className="glass rounded-2xl px-5 py-3">
            ⏱ ~{totalMinutes} min of reading
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-10">
        <Suspense fallback={null}>
          <TrendingStrip />
        </Suspense>
      </section>

      <section className="mx-auto max-w-5xl px-4">
        <NewsExplorer articles={report.articles} />
      </section>
    </div>
  );
}
