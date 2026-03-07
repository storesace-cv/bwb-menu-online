/**
 * Server-only: xAI (Grok) adapter for description generation.
 * Never import this module in client code.
 */

import type { GenerateDescriptionParams } from "./providers";

const DEFAULT_MODEL = "grok-3-mini";
const BASE_URL = "https://api.x.ai/v1";

function buildPrompt(params: GenerateDescriptionParams): string {
  const { name, ingredients, tone, maxChars } = params;
  return `Escreve em português de Portugal, em 1 a 2 frases (máximo ${maxChars} caracteres), ${tone}.
Não inventes ingredientes: usa apenas os que são fornecidos.
Não uses emojis.
Gera exatamente 3 sugestões de descrição para o seguinte prato/artigo de menu.

Nome: ${name}
Ingredientes (usa só estes): ${ingredients || "não especificados"}

Responde apenas com as 3 frases, uma por linha, sem numeração nem título.`;
}

export async function generateDescription(params: GenerateDescriptionParams): Promise<string[]> {
  const { apiKey, model } = params;
  const m = model || DEFAULT_MODEL;
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: m,
      messages: [{ role: "user", content: buildPrompt(params) }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `xAI HTTP ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) msg = j.error.message;
    } catch {
      if (errBody.length < 300) msg = errBody;
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  const lines = content
    .split(/\n+/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((s) => s.length > 0);
  return lines.slice(0, 3);
}
