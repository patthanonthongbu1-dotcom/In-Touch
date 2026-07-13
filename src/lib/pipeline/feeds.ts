import type { Category } from "../types";

export interface FeedSource {
  url: string;
  source: string;
  categoryHint: Category;
}

// Free RSS feeds, no API keys needed. categoryHint is only a hint — the
// curation step assigns the final category per story.
export const FEEDS: FeedSource[] = [
  // World
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News", categoryHint: "world" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian", categoryHint: "world" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", categoryHint: "world" },

  // AI & Technology
  { url: "https://techcrunch.com/feed/", source: "TechCrunch", categoryHint: "ai-tech" },
  { url: "https://www.theverge.com/rss/index.xml", source: "The Verge", categoryHint: "ai-tech" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", source: "Ars Technica", categoryHint: "ai-tech" },

  // Business
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business", categoryHint: "business" },
  { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", source: "CNBC", categoryHint: "business" },

  // Science
  { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC Science", categoryHint: "science" },
  { url: "https://www.sciencedaily.com/rss/top/science.xml", source: "ScienceDaily", categoryHint: "science" },

  // Politics
  { url: "https://rss.politico.com/politics-news.xml", source: "Politico", categoryHint: "politics" },

  // Sports
  { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport", categoryHint: "sports" },
  { url: "https://www.espn.com/espn/rss/news", source: "ESPN", categoryHint: "sports" },

  // Gaming
  { url: "https://www.polygon.com/rss/index.xml", source: "Polygon", categoryHint: "gaming" },
  { url: "https://www.gamespot.com/feeds/news/", source: "GameSpot", categoryHint: "gaming" },

  // Thailand
  { url: "https://www.bangkokpost.com/rss/data/topstories.xml", source: "Bangkok Post", categoryHint: "thailand" },
  { url: "https://www.bangkokpost.com/rss/data/thailand.xml", source: "Bangkok Post", categoryHint: "thailand" },
  { url: "https://www.khaosodenglish.com/feed/", source: "Khaosod English", categoryHint: "thailand" },
  { url: "https://thethaiger.com/news/feed", source: "The Thaiger", categoryHint: "thailand" },

  // Markets
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC Markets", categoryHint: "markets" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch", categoryHint: "markets" },
];
