import { fetchAllFeeds } from "./fetch";
import { curateStories } from "./curate";
import { enrichStories, type EnrichedStory } from "./enrich";
import { supabase } from "../supabase";
import { DEFAULT_SETTINGS, THAI_PER_DAY_MAX, THAI_PER_DAY_MIN } from "../settings";

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
  durationMs: number;
}

/**
 * Vercel's Hobby plan drops runtime logs after about an hour, so a cron that
 * fails at 05:00 has left no evidence by the time anyone looks. Every run
 * records what it did here instead. Logging is best-effort: a missing table or
 * a failed insert must never take the report down with it.
 */
async function startRun(date: string): Promise<string | null> {
  const { data, error } = await supabase()
    .from("pipeline_runs")
    .insert({ published_date: date, status: "running" })
    .select("id")
    .single();
  if (error) {
    console.warn(`Couldn't open a run log (${error.message}) — continuing unlogged.`);
    return null;
  }
  return data.id as string;
}

async function finishRun(id: string | null, fields: Record<string, unknown>): Promise<void> {
  if (!id) return;
  const { error } = await supabase()
    .from("pipeline_runs")
    .update({ ...fields, finished_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn(`Couldn't close the run log: ${error.message}`);
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

/**
 * How many Thailand stories to write. One report serves every reader, so it is
 * curated for the most Thailand-hungry account and each reader's feed trims it
 * back to the number they chose. Nobody's setting is a lie, and no one reader
 * can shrink the report out from under another.
 */
async function thaiStoriesPerDay(): Promise<number> {
  const { data, error } = await supabase().from("user_settings").select("settings");

  if (error) {
    console.warn(`Couldn't read saved settings (${error.message}) — using the default.`);
    return DEFAULT_SETTINGS.thaiStoriesPerDay;
  }

  const wanted = (data ?? [])
    .map((row) => (row.settings as { thaiStoriesPerDay?: unknown } | null)?.thaiStoriesPerDay)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    .map((n) => Math.min(THAI_PER_DAY_MAX, Math.max(THAI_PER_DAY_MIN, Math.round(n))));

  return wanted.length > 0
    ? Math.max(...wanted)
    : DEFAULT_SETTINGS.thaiStoriesPerDay;
}

// Columns added after the initial schema; stripped if the DB lacks them.
const OPTIONAL_COLUMNS = ["image_url", "source_published_at"];

/** Writes one batch of finished stories. Returns how many reached the table. */
async function publish(enriched: EnrichedStory[], date: string): Promise<number> {
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

  let { error } = await supabase().from("articles").upsert(rows, { onConflict: "source_url" });
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

  return rows.length;
}

export async function runPipeline(): Promise<PipelineResult> {
  const date = todayInBangkok();
  const startedAt = Date.now();
  const runId = await startRun(date);

  try {
    return await publishReport(date, startedAt, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(runId, {
      status: "failed",
      error: message,
      duration_ms: Date.now() - startedAt,
    });
    throw err;
  }
}

async function publishReport(
  date: string,
  startedAt: number,
  runId: string | null
): Promise<PipelineResult> {
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

  const thaiLimit = await thaiStoriesPerDay();
  console.log(`Curating with Claude (up to ${thaiLimit} Thailand stories)...`);
  const stories = await curateStories(items, thaiLimit);
  console.log(
    `Selected ${stories.length} stories (${stories.filter((s) => s.category === "thailand").length} from Thailand).`
  );
  if (stories.length === 0) throw new Error("Curation selected no stories.");

  // Each chunk is published the moment it is written, rather than holding the
  // whole report in memory until the end: if the run is cut short, the reader
  // gets the stories that did make it instead of an empty day.
  console.log("Writing summaries and vocabulary with Claude...");
  let published = 0;
  const enriched = await enrichStories(stories, async (batch) => {
    published += await publish(batch, date);
    console.log(`Published ${published}/${stories.length} stories so far.`);
  });

  const durationMs = Date.now() - startedAt;
  const full = enriched.length >= Math.ceil(stories.length / 2);
  if (!full) {
    console.warn(
      `Only ${enriched.length}/${stories.length} stories survived enrichment — today's report is thin.`
    );
  }

  await finishRun(runId, {
    status: full ? "ok" : "partial",
    fetched: fetched.length,
    curated: stories.length,
    published,
    duration_ms: durationMs,
  });

  console.log(`Published ${published} articles for ${date} in ${Math.round(durationMs / 1000)}s.`);
  return {
    fetched: fetched.length,
    curated: stories.length,
    published,
    skipped: stories.length - enriched.length,
    date,
    durationMs,
  };
}
