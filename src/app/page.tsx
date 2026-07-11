import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { CATEGORIES, CATEGORY_META, type Article } from "@/lib/types";

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
    <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
      <p className="font-medium text-neutral-900 dark:text-neutral-100">No news yet</p>
      <p className="mt-2">{message}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>Create a Supabase project and run <code>supabase/schema.sql</code> (and optionally <code>seed.sql</code>).</li>
        <li>Fill in <code>.env.local</code> from <code>.env.example</code>.</li>
        <li>Run <code>npm run pipeline</code> to fetch and publish today&apos;s report.</li>
      </ol>
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

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Daily Report</h1>
      <p className="mt-1 text-sm text-neutral-500">{displayDate}</p>

      {CATEGORIES.map((category) => {
        const articles = report.articles.filter((a) => a.category === category);
        if (articles.length === 0) return null;
        const meta = CATEGORY_META[category];
        return (
          <section key={category} className="mt-8">
            <h2 className="text-lg font-semibold">
              {meta.emoji} {meta.label}
            </h2>
            <ul className="mt-3 space-y-3">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/article/${article.id}`}
                    className="block rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                  >
                    <h3 className="font-medium leading-snug">{article.headline}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {article.summary}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-neutral-500">
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium dark:bg-neutral-800">
                        {article.difficulty}
                      </span>
                      <span>{article.reading_time_min} min read</span>
                      <span>{article.vocabulary.length} vocab words</span>
                      <span>{article.source}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
