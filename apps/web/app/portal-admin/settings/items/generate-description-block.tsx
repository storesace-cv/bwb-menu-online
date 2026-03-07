"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/admin";

type Props = {
  storeId: string;
  aiEnabled: boolean;
  getCurrentName: () => string;
  getCurrentIngredients: () => string;
  onApply: (suggestion: string) => void;
};

export function GenerateDescriptionBlock({
  storeId,
  aiEnabled,
  getCurrentName,
  getCurrentIngredients,
  onApply,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleGenerate() {
    setError(null);
    const name = getCurrentName().trim();
    if (!name) {
      setError("Indique o nome do artigo para gerar descrições.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/portal-admin/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          name,
          ingredients: getCurrentIngredients().trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        setModalOpen(true);
      } else {
        setError(data.error ?? (res.status === 429 ? "Limite de gerações atingido. Tente mais tarde." : "Erro ao gerar."));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApply(suggestion: string) {
    onApply(suggestion);
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-1">
      {aiEnabled ? (
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="inline-block" />
              A gerar…
            </span>
          ) : (
            "Gerar descrição"
          )}
        </Button>
      ) : (
        <button
          type="button"
          disabled
          title="Ative em Configurações → ChatGPT / Grok"
          className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed"
        >
          Gerar descrição
        </button>
      )}
      {error && (
        <p className="text-sm text-amber-400">{error}</p>
      )}
      {modalOpen && suggestions.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Sugestões de descrição"
        >
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-w-lg w-full mx-4 p-5">
            <h3 className="text-lg font-medium text-slate-100 mb-3">Escolha uma sugestão</h3>
            <ul className="space-y-3 mb-4">
              {suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <p className="flex-1 text-sm text-slate-300 border border-slate-600 rounded p-2 bg-slate-900">
                    {s}
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleApply(s)}
                  >
                    Aplicar
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
