import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CATEGORY_META, type Article } from "@/lib/types";
import Reader from "@/components/Reader";
import MarkDone from "@/components/MarkDone";
import { formatDateTimeBangkok } from "@/lib/dates";

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

  // Neighbors in today's report (importance order) for prev/next navigation.
  const { data: siblings } = await supabase()
    .from("articles")
    .select("id, headline")
    .eq("published_date", article.published_date)
    .order("importance", { ascending: false });
  const report = siblings ?? [];
  const index = report.findIndex((a) => a.id === article.id);
  const prev = index > 0 ? report[index - 1] : null;
  const next = index >= 0 && index < report.length - 1 ? report[index + 1] : null;

  return (
    <article className="mx-auto max-w-3xl px-4 pt-10">
      <Link
        href="/"
        transitionTypes={["nav-back"]}
        className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-all hover:-translate-x-0.5 hover:bg-white hover:text-neutral-950"
      >
        ← Today&apos;s report
      </Link>

      <div className="glass mt-6 overflow-hidden rounded-3xl">
        {article.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            className="h-52 w-full object-cover sm:h-80"
          />
        )}
        <div className="p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-neutral-700 ring-1 ring-neutral-200/70">
            {meta.emoji} {meta.label}
          </span>
          <span className="rounded-full border border-neutral-950 bg-white/80 px-2.5 py-1 font-semibold text-neutral-950">
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

        <p className="mt-3 text-xs text-neutral-400">
          {article.source_published_at && (
            <>
              Originally published {formatDateTimeBangkok(article.source_published_at)}
              <span className="mx-1.5">·</span>
            </>
          )}
          Added to InTouch {formatDateTimeBangkok(article.created_at)}
          <span className="ml-1">(Bangkok time)</span>
        </p>

        <Reader
          articleId={article.id}
          headline={article.headline}
          summary={article.summary}
          vocabulary={article.vocabulary}
        />
        </div>
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

      <div className="mt-8">
        <MarkDone articleId={article.id} />
      </div>

      {(prev || next) && (
        <nav className="mt-4 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/article/${prev.id}`}
              transitionTypes={["nav-back"]}
              className="glass group rounded-3xl p-5 ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:bg-white/85 hover:ring-neutral-950/25"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                ← Previous story
              </p>
              <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-neutral-950">
                {prev.headline}
              </p>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={`/article/${next.id}`}
              transitionTypes={["nav-forward"]}
              className="glass group rounded-3xl p-5 text-right ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:bg-white/85 hover:ring-neutral-950/25"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Next story →
              </p>
              <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-neutral-950">
                {next.headline}
              </p>
            </Link>
          )}
        </nav>
      )}

      <p className="mt-6 text-center">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="text-sm font-medium text-neutral-400 underline-offset-4 transition-colors duration-150 hover:text-neutral-950 hover:underline"
        >
          All of today&apos;s stories
        </Link>
      </p>
    </article>
  );
}
