/**
 * Server-only: AI providers for description generation.
 * Never import this module in client code.
 */

import type { AIProvider, GenerateDescriptionParams } from "./providers";
import { generateDescription as openaiGenerate } from "./openai";
import { generateDescription as xaiGenerate } from "./xai";

export type { AIProvider, GenerateDescriptionParams } from "./providers";

export async function generateDescription(params: GenerateDescriptionParams): Promise<string[]> {
  if (params.provider === "openai") {
    return openaiGenerate(params);
  }
  if (params.provider === "xai") {
    return xaiGenerate(params);
  }
  throw new Error(`Unknown AI provider: ${params.provider}`);
}
