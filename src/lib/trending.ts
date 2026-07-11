import Parser from "rss-parser";

export interface Trend {
  title: string;
  traffic: string;
  searchUrl: string;
}

interface TrendItemFields {
  traffic?: string;
}

// Google's Daily Search Trends RSS — free, keyless, refreshed continuously.
const FEED_URL = (geo: string) => `https://trends.google.com/trending/rss?geo=${geo}`;

export async function fetchTrends(geo: string, limit = 10): Promise<Trend[]> {
  const res = await fetch(FEED_URL(geo), {
    headers: { "User-Agent": "Mozilla/5.0 (InTouch news reader)" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Trends feed ${geo} returned ${res.status}`);
  const xml = await res.text();

  const parser = new Parser<object, TrendItemFields>({
    customFields: { item: [["ht:approx_traffic", "traffic"]] },
  });
  const feed = await parser.parseString(xml);

  return (feed.items ?? [])
    .filter((item) => item.title)
    .slice(0, limit)
    .map((item) => ({
      title: item.title!.trim(),
      traffic: item.traffic ?? "",
      searchUrl: `https://news.google.com/search?q=${encodeURIComponent(item.title!.trim())}`,
    }));
}

export async function fetchAllTrends(): Promise<{ thailand: Trend[]; worldwide: Trend[] }> {
  const [thailand, worldwide] = await Promise.allSettled([fetchTrends("TH"), fetchTrends("US")]);
  return {
    thailand: thailand.status === "fulfilled" ? thailand.value : [],
    worldwide: worldwide.status === "fulfilled" ? worldwide.value : [],
  };
}
