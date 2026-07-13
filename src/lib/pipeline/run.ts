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

// PostgREST takes `in` filters as a GET query string, and a full feed haul
// (~200-300 URLs, >20KB) overflows the gateway's request limit — so the URLs
// go up in batches rather than one doomed request.
const LOOKUP_BATCH = 50;

async function publishedBefore(urls: string[], date: string): Promise<Set<string>> {
  const db = supabase();
  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += LOOKUP_BATCH) {
    batches.push(urls.slice(i, i + LOOKUP_BATCH));
  }

  const found = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await db
        .from("articles")
        .select("source_url")
        .in("source_url", batch)
        .lt("published_date", date);
      if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
      return (data ?? []).map((row) => row.source_url as string);
    })
  );

  return new Set(found.flat());
}

export async function runPipeline(): Promise<PipelineResult> {
  const date = todayInBangkok();

  console.log("Fetching feeds...");
  const fetched = await fetchAllFeeds();
  console.log(`Fetched ${fetched.length} items after dedupe.`);
  if (fetched.length === 0) throw new Error("No feed items fetched — check network/feeds.");

  // Drop items already published in an earlier day's report: each day should
  // surface new coverage, not carry yesterday's cards forward. (Items from
  // today's own report stay eligible so same-day re-runs refresh them.)
  const previouslyPublished = await publishedBefore(fetched.map((item) => item.link), date);
  const items = fetched.filter((item) => !previouslyPublished.has(item.link));
  if (previouslyPublished.size > 0) {
    console.log(`Skipping ${fetched.length - items.length} items already published on earlier days.`);
  }
  if (items.length === 0) throw new Error("Nothing new since the last report.");

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
    fetched: fetched.length,
    curated: stories.length,
    published: rows.length,
    skipped: stories.length - enriched.length,
    date,
  };
}
