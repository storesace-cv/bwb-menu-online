/**
 * Server-only: AI provider interface for description generation.
 * Never import this module in client code.
 */

export type AIProvider = "openai" | "xai";

export interface GenerateDescriptionParams {
  provider: AIProvider;
  apiKey: string;
  model: string;
  tone: string;
  maxChars: number;
  name: string;
  ingredients: string;
}

/**
 * Generate 3 short description suggestions (pt-PT, 1-2 sentences, no invented ingredients).
 */
export type GenerateDescriptionFn = (
  params: GenerateDescriptionParams
) => Promise<string[]>;
