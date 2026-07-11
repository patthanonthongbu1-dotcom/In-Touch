import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
