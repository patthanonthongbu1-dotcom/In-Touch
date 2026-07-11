import { z } from "zod";
import { structuredCompletion, provider } from "./llm";
import type { CuratedStory } from "./curate";
import type { VocabEntry } from "../types";

const VocabEntrySchema = z.object({
  word: z.string().describe("The word or short phrase exactly as it appears in the summary"),
  meaning: z.string().describe("Learner-friendly English definition"),
  pronunciation: z.string().describe("IPA, e.g. /ˈlændmɑːrk/"),
  partOfSpeech: z.string(),
  cefr: z.enum(["A2", "B1", "B2", "C1", "C2"]),
  example: z.string().describe("A new example sentence, different from the summary"),
  synonyms: z.array(z.string()),
  collocations: z.array(z.string()),
  thai: z.string().describe("Thai translation of the word in this sense"),
  whyUseful: z.string().describe("One sentence on why this word is worth learning"),
});

const EnrichmentSchema = z.object({
  summary: z.string(),
  whyItMatters: z.string(),
  difficulty: z.enum(["B1", "B2", "C1", "C2"]),
  readingTimeMin: z.number().int(),
  vocabulary: z.array(VocabEntrySchema),
  related: z.array(z.string()),
});

export interface EnrichedStory {
  story: CuratedStory;
  summary: string;
  whyItMatters: string;
  difficulty: string;
  readingTimeMin: number;
  vocabulary: VocabEntry[];
  related: string[];
}

const SYSTEM = `You write article entries for a daily English-learning news digest. The reader is a Thai native speaker with intermediate-to-advanced English (around B2). Your goals: keep them accurately informed, and grow their vocabulary through real news.

For each story:
- summary: 4-6 sentences, factual and neutral, written in clear natural English at the stated difficulty level. Base it only on the provided headlines/snippets — never invent specifics (numbers, quotes, names) that aren't given.
- whyItMatters: 1-2 sentences explaining why the reader should care.
- difficulty: the CEFR reading level of your summary (B1-C2).
- readingTimeMin: realistic minutes to read the summary carefully (usually 1-3).
- vocabulary: 4-7 words or short phrases that literally appear in your summary. Choose words that are useful in everyday English, common in news, appropriate for the reader's level, and worth long-term learning. Skip proper nouns and words a B1 learner already knows (unless used in a special sense).
- related: headlines of the other coverage of this event, if any (may be empty).`;

async function enrichOne(story: CuratedStory): Promise<EnrichedStory> {
  const coverage = story.items
    .map((item) => `- [${item.source}] ${item.title}${item.snippet ? ` — ${item.snippet}` : ""}`)
    .join("\n");

  const parsed = await structuredCompletion({
    system: SYSTEM,
    user: `Story headline: ${story.headline}\nCategory: ${story.category}\n\nCoverage:\n${coverage}\n\nWrite the digest entry.`,
    schema: EnrichmentSchema,
  });

  return {
    story,
    summary: parsed.summary,
    whyItMatters: parsed.whyItMatters,
    difficulty: parsed.difficulty,
    readingTimeMin: Math.max(1, parsed.readingTimeMin),
    vocabulary: parsed.vocabulary,
    related: parsed.related,
  };
}

export async function enrichStories(stories: CuratedStory[]): Promise<EnrichedStory[]> {
  // The Gemini free tier is capped at ~10 requests/minute, so go gentler there.
  const concurrency = provider() === "gemini" ? 2 : 3;
  const enriched: EnrichedStory[] = [];
  for (let i = 0; i < stories.length; i += concurrency) {
    const batch = stories.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(enrichOne));
    batch.forEach((story, j) => {
      const result = results[j];
      if (result.status === "fulfilled") {
        enriched.push(result.value);
      } else {
        console.warn(`Skipping "${story.headline}": ${result.reason}`);
      }
    });
  }
  return enriched;
}
