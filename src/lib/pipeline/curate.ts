import { z } from "zod";
import { structuredCompletion } from "./llm";
import { CATEGORIES } from "../types";
import type { RawItem } from "./fetch";

const CurationSchema = z.object({
  stories: z.array(
    z.object({
      itemIndices: z
        .array(z.number().int())
        .describe("Indices of every input item covering this story (merged coverage)"),
      headline: z.string().describe("The clearest headline for the story, chosen or lightly edited from the inputs"),
      category: z.enum(CATEGORIES),
      importance: z.number().int().describe("Global importance, 1-100"),
    })
  ),
});

export interface CuratedStory {
  items: RawItem[];
  headline: string;
  category: (typeof CATEGORIES)[number];
  importance: number;
}

const SYSTEM = `You are the news editor for a daily English-learning news digest read by an intermediate-to-advanced English learner in Thailand. From a raw list of RSS items you produce today's story selection.

Rules:
- Merge items that cover the same underlying event into one story (list all their indices).
- Rank by genuine global importance: impact on many people, significance for the future, not clickbait or celebrity gossip.
- Assign exactly one category per story from the allowed set. "ai-tech" covers AI and technology; "markets" covers stock/crypto/currency movements; "thailand" covers news about Thailand.
- Select at most 3 stories per category and at most 18 stories total. Skip categories with nothing genuinely newsworthy.
- Prefer stories with enough substance in the snippet to summarize meaningfully.`;

export async function curateStories(items: RawItem[]): Promise<CuratedStory[]> {
  const listing = items
    .map(
      (item, i) =>
        `${i}. [${item.source} / ${item.categoryHint}] ${item.title}${item.snippet ? ` — ${item.snippet}` : ""}`
    )
    .join("\n");

  const parsed = await structuredCompletion({
    system: SYSTEM,
    user: `Here are today's raw items:\n\n${listing}\n\nSelect, merge, categorize, and rank today's stories.`,
    schema: CurationSchema,
  });

  return parsed.stories
    .map((story) => ({
      items: story.itemIndices.map((i) => items[i]).filter(Boolean),
      headline: story.headline,
      category: story.category,
      importance: Math.max(1, Math.min(100, story.importance)),
    }))
    .filter((story) => story.items.length > 0)
    .sort((a, b) => b.importance - a.importance)
    // Gemini's free tier allows 20 requests/day per model: 1 curation + 18 enrichments fits.
    .slice(0, 18);
}
