import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CATEGORY_META, type Article } from "@/lib/types";
import Reader from "@/components/Reader";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase()
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  const article = data as Article;
  const meta = CATEGORY_META[article.category] ?? { emoji: "📰", label: article.category };

  return (
    <article className="mx-auto max-w-3xl px-4 pt-10">
      <Link
        href="/"
        className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-all hover:-translate-x-0.5 hover:bg-white hover:text-neutral-950"
      >
        ← Today&apos;s report
      </Link>

      <div className="glass mt-6 rounded-3xl p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-neutral-600 ring-1 ring-neutral-200/70">
            {meta.emoji} {meta.label}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200/70">
            Level {article.difficulty}
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-neutral-500 ring-1 ring-neutral-200/70">
            ⏱ {article.reading_time_min} min read
          </span>
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/80 px-2.5 py-1 text-neutral-500 ring-1 ring-neutral-200/70 transition-colors hover:text-neutral-900"
          >
            {article.source} ↗
          </a>
        </div>

        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-neutral-950 sm:text-4xl">
          {article.headline}
        </h1>

        <Reader
          articleId={article.id}
          headline={article.headline}
          summary={article.summary}
          vocabulary={article.vocabulary}
        />
      </div>

      {article.why_it_matters && (
        <div className="glass mt-5 rounded-3xl border-l-4 border-l-amber-400 p-6 text-sm">
          <p className="font-semibold text-neutral-900">💡 Why it matters</p>
          <p className="mt-1.5 leading-relaxed text-neutral-600">{article.why_it_matters}</p>
        </div>
      )}

      {article.related.length > 0 && (
        <div className="glass mt-5 rounded-3xl p-6">
          <p className="text-sm font-semibold text-neutral-900">🗞 Related coverage</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-neutral-500">
            {article.related.map((headline) => (
              <li key={headline}>{headline}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
