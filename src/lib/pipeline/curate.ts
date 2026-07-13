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

// Every category but Thailand is capped at 3; the reader chooses how many Thai
// stories they want, and the report grows to fit rather than crowding out the
// international news.
const PER_CATEGORY = 3;
const NON_THAI_TOTAL = 15;

const systemPrompt = (thaiLimit: number) => `You are the news editor for a daily English-learning news digest read by an intermediate-to-advanced English learner in Thailand. From a raw list of RSS items you produce today's story selection.

Rules:
- Merge items that cover the same underlying event into one story (list all their indices).
- Rank by genuine importance: impact on many people, significance for the future, not clickbait or celebrity gossip. The reader lives in Thailand, so news that affects daily life there carries real weight even when its global significance is modest.
- Assign exactly one category per story from the allowed set. "ai-tech" covers AI and technology; "markets" covers stock/crypto/currency movements; "thailand" covers news about Thailand.
- Select at most ${PER_CATEGORY} stories per category, except "thailand", where you may select up to ${thaiLimit}. At most ${NON_THAI_TOTAL + thaiLimit} stories total. Skip categories with nothing genuinely newsworthy.
- Fill the Thailand slots whenever the day offers ${thaiLimit} worthwhile Thai stories — reach past the headline news into business, policy, and society rather than padding with thin items.
- Prefer stories with enough substance in the snippet to summarize meaningfully.`;

export async function curateStories(items: RawItem[], thaiLimit: number): Promise<CuratedStory[]> {
  const listing = items
    .map(
      (item, i) =>
        `${i}. [${item.source} / ${item.categoryHint}] ${item.title}${item.snippet ? ` — ${item.snippet}` : ""}`
    )
    .join("\n");

  const parsed = await structuredCompletion({
    system: systemPrompt(thaiLimit),
    user: `Here are today's raw items:\n\n${listing}\n\nSelect, merge, categorize, and rank today's stories.`,
    schema: CurationSchema,
  });

  const ranked = parsed.stories
    .map((story) => ({
      items: story.itemIndices.map((i) => items[i]).filter(Boolean),
      headline: story.headline,
      category: story.category,
      importance: Math.max(1, Math.min(100, story.importance)),
    }))
    .filter((story) => story.items.length > 0)
    .sort((a, b) => b.importance - a.importance);

  // The prompt states the caps, but the reader's Thai count is a promise the
  // model shouldn't be able to break — so hold the line here too, keeping the
  // most important story wherever a cap bites.
  const used = new Map<string, number>();
  const picked: CuratedStory[] = [];
  let nonThai = 0;

  for (const story of ranked) {
    const isThai = story.category === "thailand";
    const cap = isThai ? thaiLimit : PER_CATEGORY;
    const taken = used.get(story.category) ?? 0;
    if (taken >= cap) continue;
    if (!isThai && nonThai >= NON_THAI_TOTAL) continue;

    used.set(story.category, taken + 1);
    if (!isThai) nonThai += 1;
    picked.push(story);
  }

  return picked;
}
