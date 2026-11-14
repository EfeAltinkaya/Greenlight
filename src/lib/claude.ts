import Anthropic from "@anthropic-ai/sdk";

// One shared client. Reads ANTHROPIC_API_KEY from .env.local (laptop) or Vercel env vars.
export const claude = new Anthropic();

// Models live here only. Cheapest model for reading and filling; a mid model for text people read.
export const MODELS = {
  fast: "claude-haiku-5-5", // extraction, budget rows, quote reading
  write: "claude-sonnet-5-5", // application answers, review comments, decision emails, sponsor pitches
} as const;

export function hasKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
