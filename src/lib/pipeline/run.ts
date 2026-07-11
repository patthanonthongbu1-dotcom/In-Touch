import { fetchAllFeeds } from "./fetch";
import { curateStories } from "./curate";
import { enrichStories } from "./enrich";
import { supabase } from "../supabase";

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

export interface PipelineResult {
  fetched: number;
  curated: number;
  published: number;
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
  }));

  let { error } = await supabase()
    .from("articles")
    .upsert(rows, { onConflict: "source_url" });
  if (error && error.message.includes("image_url")) {
    console.warn(
      "articles.image_url column missing — publishing without images. Run in Supabase SQL editor: alter table articles add column if not exists image_url text;"
    );
    const withoutImages = rows.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      delete copy.image_url;
      return copy;
    });
    ({ error } = await supabase().from("articles").upsert(withoutImages, { onConflict: "source_url" }));
  }
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

  console.log(`Published ${rows.length} articles for ${date}.`);
  return { fetched: items.length, curated: stories.length, published: rows.length, date };
}
