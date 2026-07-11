export const CATEGORIES = [
  "world",
  "ai-tech",
  "business",
  "science",
  "politics",
  "sports",
  "gaming",
  "thailand",
  "markets",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { emoji: string; label: string }> = {
  world: { emoji: "🌍", label: "Top World News" },
  "ai-tech": { emoji: "🤖", label: "AI & Technology" },
  business: { emoji: "💼", label: "Business" },
  science: { emoji: "🔬", label: "Science" },
  politics: { emoji: "🏛️", label: "Politics" },
  sports: { emoji: "⚽", label: "Sports" },
  gaming: { emoji: "🎮", label: "Gaming" },
  thailand: { emoji: "🇹🇭", label: "Thailand" },
  markets: { emoji: "📈", label: "Market Updates" },
};

export type CefrLevel = "A2" | "B1" | "B2" | "C1" | "C2";

export interface VocabEntry {
  word: string;
  meaning: string;
  pronunciation: string;
  partOfSpeech: string;
  cefr: CefrLevel;
  example: string;
  synonyms: string[];
  collocations: string[];
  thai: string;
  whyUseful: string;
}

export interface Article {
  id: string;
  published_date: string;
  headline: string;
  source: string;
  source_url: string;
  category: Category;
  summary: string;
  why_it_matters: string;
  difficulty: string;
  reading_time_min: number;
  importance: number;
  vocabulary: VocabEntry[];
  related: string[];
  created_at: string;
}

export interface VocabBankItem {
  id: string;
  user_id: string;
  word: string;
  card: VocabEntry;
  article_id: string | null;
  article_headline: string | null;
  learned_at: string;
  review_count: number;
  mastery: number;
  favorite: boolean;
}
