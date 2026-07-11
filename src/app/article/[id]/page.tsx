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
    <article>
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Back to today&apos;s report
      </Link>

      <p className="mt-4 text-sm text-neutral-500">
        {meta.emoji} {meta.label}
      </p>
      <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">
        {article.headline}
      </h1>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium dark:bg-neutral-800">
          Level {article.difficulty}
        </span>
        <span>{article.reading_time_min} min read</span>
        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {article.source} ↗
        </a>
      </p>

      <Reader
        articleId={article.id}
        headline={article.headline}
        summary={article.summary}
        vocabulary={article.vocabulary}
      />

      {article.why_it_matters && (
        <div className="mt-6 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <p className="font-semibold">Why it matters</p>
          <p className="mt-1">{article.why_it_matters}</p>
        </div>
      )}

      {article.related.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold">Related coverage</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
            {article.related.map((headline) => (
              <li key={headline}>{headline}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
