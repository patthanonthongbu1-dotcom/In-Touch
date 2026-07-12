import { fetchAllFeeds } from "./fetch";
import { curateStories } from "./curate";
import { enrichStories } from "./enrich";
import { supabase } from "../supabase";

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function earliestPublished(timestamps: string[]): string | null {
  const parsed = timestamps.map((t) => Date.parse(t)).filter((n) => !Number.isNaN(n));
  return parsed.length > 0 ? new Date(Math.min(...parsed)).toISOString() : null;
}

export interface PipelineResult {
  fetched: number;
  curated: number;
  published: number;
  skipped: number;
  date: string;
}

export async function runPipeline(): Promise<PipelineResult> {
  const date = todayInBangkok();

  console.log("Fetching feeds...");
  const items = await fetchAllFeeds();
  console.log(`Fetched ${items.length} items after dedupe.`);
  if (items.length === 0) throw new Error("No feed items fetched — check network/feeds.");

  console.log("Curating with Claude...");
  const stories = await curateStories(items);
  console.log(`Selected ${stories.length} stories.`);

  console.log("Writing summaries and vocabulary with Claude...");
  const enriched = await enrichStories(stories);
  console.log(`Enriched ${enriched.length} stories.`);

  // The homepage shows only the newest published_date, so a mostly-failed run
  // must not replace a full day's report with a near-empty one.
  if (enriched.length < Math.ceil(stories.length / 2)) {
    throw new Error(
      `Only ${enriched.length}/${stories.length} stories enriched — refusing to publish a partial day.`
    );
  }

  const rows = enriched.map((e) => ({
    published_date: date,
    headline: e.story.headline,
    source: [...new Set(e.story.items.map((i) => i.source))].join(", "),
    source_url: e.story.items[0].link,
    category: e.story.category,
    summary: e.summary,
    why_it_matters: e.whyItMatters,
    difficulty: e.difficulty,
    reading_time_min: e.readingTimeMin,
    importance: e.story.importance,
    vocabulary: e.vocabulary,
    related: e.related,
    image_url: e.story.items.find((i) => i.image)?.image ?? null,
    source_published_at: earliestPublished(e.story.items.map((i) => i.publishedAt)),
  }));

  // Columns added after the initial schema; stripped if the DB lacks them.
  const OPTIONAL_COLUMNS = ["image_url", "source_published_at"];

  let { error } = await supabase()
    .from("articles")
    .upsert(rows, { onConflict: "source_url" });
  if (error && OPTIONAL_COLUMNS.some((col) => error!.message.includes(col))) {
    console.warn(
      `Optional columns missing — publishing without them. Run supabase/schema.sql migrations. (${error.message})`
    );
    const stripped = rows.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      for (const col of OPTIONAL_COLUMNS) delete copy[col];
      return copy;
    });
    ({ error } = await supabase().from("articles").upsert(stripped, { onConflict: "source_url" }));
  }
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

  console.log(`Published ${rows.length} articles for ${date}.`);
  return {
    fetched: items.length,
    curated: stories.length,
    published: rows.length,
    skipped: stories.length - enriched.length,
    date,
  };
}
