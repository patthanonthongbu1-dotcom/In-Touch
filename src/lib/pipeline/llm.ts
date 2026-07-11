import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Gemini is preferred when configured: its free tier (aistudio.google.com)
// covers the pipeline's ~25 requests/day at zero cost.
export type Provider = "gemini" | "anthropic";

export function provider(): Provider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new Error(
    "No AI provider configured. Set GEMINI_API_KEY (free at https://aistudio.google.com) or ANTHROPIC_API_KEY in .env.local."
  );
}

const GEMINI_MODEL = () => process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const ANTHROPIC_MODEL = () => process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

let geminiClient: GoogleGenAI | null = null;
let anthropicClient: Anthropic | null = null;

function gemini(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

function anthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

interface StructuredRequest<S extends z.ZodType> {
  system: string;
  user: string;
  schema: S;
}

async function callGemini<S extends z.ZodType>({ system, user, schema }: StructuredRequest<S>): Promise<z.infer<S>> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema; // Gemini rejects the meta-schema key

  const response = await gemini().models.generateContent({
    model: GEMINI_MODEL(),
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error(`Gemini returned no text (finishReason: ${response.candidates?.[0]?.finishReason})`);
  }
  return schema.parse(JSON.parse(text));
}

async function callAnthropic<S extends z.ZodType>({ system, user, schema }: StructuredRequest<S>): Promise<z.infer<S>> {
  const response = await anthropic().messages.parse({
    model: ANTHROPIC_MODEL(),
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(schema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error(`Output failed to parse (stop_reason: ${response.stop_reason})`);
  }
  return parsed;
}

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // A per-DAY quota won't recover within a retry window — fail fast.
  if (/PerDay/i.test(message)) return false;
  return /429|RESOURCE_EXHAUSTED|rate.?limit|overloaded|529|503/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One structured-output call, routed to whichever provider is configured.
 * Retries rate-limit errors (the Gemini free tier caps requests per minute).
 */
export async function structuredCompletion<S extends z.ZodType>(request: StructuredRequest<S>): Promise<z.infer<S>> {
  const activeProvider = provider();
  const MAX_ATTEMPTS = 4;

  for (let attempt = 1; ; attempt++) {
    try {
      return activeProvider === "gemini" ? await callGemini(request) : await callAnthropic(request);
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) throw error;
      const waitMs = 20_000 * attempt;
      console.warn(`Rate-limited (attempt ${attempt}/${MAX_ATTEMPTS}), waiting ${waitMs / 1000}s…`);
      await sleep(waitMs);
    }
  }
}
