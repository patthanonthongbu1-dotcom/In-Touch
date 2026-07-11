import Parser from "rss-parser";
import { FEEDS } from "./feeds";
import type { Category } from "../types";

export interface RawItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  categoryHint: Category;
  publishedAt: string;
  image?: string;
}

const MAX_AGE_HOURS = 36;
const MAX_PER_FEED = 30;
const MAX_TOTAL = 300;
const SNIPPET_CHARS = 240;

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type MediaEntry = { $?: { url?: string; medium?: string } } | string;
type MediaField = MediaEntry | MediaEntry[];

interface MediaItem {
  mediaContent?: MediaField;
  mediaThumbnail?: MediaField;
}

function mediaUrl(field: MediaField | undefined): string | undefined {
  if (!field) return undefined;
  const entries = Array.isArray(field) ? field : [field];
  for (const entry of entries) {
    if (typeof entry === "string") {
      if (entry.startsWith("http")) return entry;
      continue;
    }
    if (entry.$?.medium && entry.$.medium !== "image") continue;
    if (entry.$?.url?.startsWith("http")) return entry.$.url;
  }
  return undefined;
}

function upscaleImage(url: string): string {
  // BBC feeds serve 240px thumbnails; the same path exists at larger widths.
  return url.replace("ichef.bbci.co.uk/ace/standard/240/", "ichef.bbci.co.uk/ace/standard/976/");
}

function extractImage(item: Parser.Item & MediaItem): string | undefined {
  const enclosure = item.enclosure;
  if (
    enclosure?.url?.startsWith("http") &&
    (enclosure.type
      ? enclosure.type.startsWith("image/")
      : /\.(jpe?g|png|webp|gif)(\?|$)/i.test(enclosure.url))
  ) {
    return upscaleImage(enclosure.url);
  }
  const url = mediaUrl(item.mediaContent) ?? mediaUrl(item.mediaThumbnail);
  return url ? upscaleImage(url) : undefined;
}

export async function fetchAllFeeds(): Promise<RawItem[]> {
  const parser = new Parser<object, MediaItem>({
    timeout: 15000,
    customFields: {
      item: [
        ["media:content", "mediaContent", { keepArray: true }],
        ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ],
    },
  });
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).slice(0, MAX_PER_FEED).flatMap((item) => {
        const title = item.title?.trim();
        const link = item.link?.trim();
        if (!title || !link) return [];
        const published = item.isoDate ?? item.pubDate;
        const publishedMs = published ? Date.parse(published) : Date.now();
        if (!Number.isNaN(publishedMs) && publishedMs < cutoff) return [];
        return [
          {
            title,
            link,
            snippet: (item.contentSnippet ?? "").replace(/\s+/g, " ").slice(0, SNIPPET_CHARS),
            source: feed.source,
            categoryHint: feed.categoryHint,
            publishedAt: published ?? new Date().toISOString(),
            image: extractImage(item),
          } satisfies RawItem,
        ];
      });
    })
  );

  const items: RawItem[] = [];
  for (const [i, result] of results.entries()) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.warn(`Feed failed: ${FEEDS[i].source} (${FEEDS[i].url}) — ${result.reason}`);
    }
  }

  // Exact-duplicate removal by URL and by normalized title. Same-event
  // merging across sources happens later in the Claude curation step.
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped = items.filter((item) => {
    const url = normalizeUrl(item.link);
    const title = normalizeTitle(item.title);
    if (seenUrls.has(url) || seenTitles.has(title)) return false;
    seenUrls.add(url);
    seenTitles.add(title);
    return true;
  });

  deduped.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return deduped.slice(0, MAX_TOTAL);
}
