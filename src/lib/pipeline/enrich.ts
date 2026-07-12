import { z } from "zod";
import { structuredCompletion } from "./llm";
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

const BatchSchema = z.object({
  entries: z
    .array(EnrichmentSchema)
    .describe("One digest entry per input story, in the same order as the stories were given"),
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

You receive several stories at once and return one entry per story, in the same order. For each story:
- summary: 4-6 sentences, factual and neutral, written in clear natural English matched to the difficulty you assign. Base it only on the provided headlines/snippets — never invent specifics (numbers, quotes, names) that aren't given.
- whyItMatters: 1-2 sentences explaining why the reader should care.
- difficulty: match the story's genuine complexity and use the FULL range across the day's stories — B1 for simple everyday stories (sports results, straightforward events), B2 for standard news, C1 for analytical/technical stories (economics, science, geopolitics), C2 for genuinely dense or abstract topics. Do not default everything to B2; write the summary's language at the level you choose.
- readingTimeMin: realistic minutes to read the summary carefully (usually 1-3).
- vocabulary: 4-7 words or short phrases that literally appear in your summary. Choose words that are useful in everyday English, common in news, appropriate for the reader's level, and worth long-term learning. Skip proper nouns and words a B1 learner already knows (unless used in a special sense).
- related: headlines of the other coverage of this event, if any (may be empty).`;

// Stories are enriched several per request: the Gemini free tier allows only
// 20 requests/day for this model, so a full run (1 curation + ~3 enrichment
// chunks) must leave headroom for retries and manual runs.
const CHUNK_SIZE = 6;

async function enrichChunk(stories: CuratedStory[]): Promise<EnrichedStory[]> {
  const blocks = stories
    .map((story, i) => {
      const coverage = story.items
        .map((item) => `- [${item.source}] ${item.title}${item.snippet ? ` — ${item.snippet}` : ""}`)
        .join("\n");
      return `### Story ${i + 1}: ${story.headline}\nCategory: ${story.category}\nCoverage:\n${coverage}`;
    })
    .join("\n\n");

  const parsed = await structuredCompletion({
    system: SYSTEM,
    user: `Here are today's ${stories.length} stories:\n\n${blocks}\n\nWrite one digest entry per story, in the same order.`,
    schema: BatchSchema,
  });

  if (parsed.entries.length !== stories.length) {
    throw new Error(`Expected ${stories.length} entries, got ${parsed.entries.length}`);
  }

  return stories.map((story, i) => {
    const entry = parsed.entries[i];
    return {
      story,
      summary: entry.summary,
      whyItMatters: entry.whyItMatters,
      difficulty: entry.difficulty,
      readingTimeMin: Math.max(1, entry.readingTimeMin),
      vocabulary: entry.vocabulary,
      related: entry.related,
    };
  });
}

export async function enrichStories(stories: CuratedStory[]): Promise<EnrichedStory[]> {
  const enriched: EnrichedStory[] = [];
  for (let i = 0; i < stories.length; i += CHUNK_SIZE) {
    const chunk = stories.slice(i, i + CHUNK_SIZE);
    try {
      enriched.push(...(await enrichChunk(chunk)));
    } catch (error) {
      console.warn(
        `Enrichment chunk failed, skipping ${chunk.length} stories (${chunk
          .map((s) => `"${s.headline}"`)
          .join(", ")}): ${error}`
      );
    }
  }
  return enriched;
}
