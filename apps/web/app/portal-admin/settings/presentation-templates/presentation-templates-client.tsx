"use client";

import { useState, useEffect } from "react";
import { useFormState } from "react-dom";
import { copyPresentationTemplate } from "../../actions";
import { Button, Input, Alert } from "@/components/admin";

type Template = { id: string; name: string; component_key: string };

export function PresentationTemplatesClient({ templates }: { templates: Template[] }) {
  const [copyState, copyFormAction] = useFormState(copyPresentationTemplate, null);
  const [copyModalSource, setCopyModalSource] = useState<Template | null>(null);

  useEffect(() => {
    if (copyState && "success" in copyState && copyState.success) {
      setCopyModalSource(null);
    }
  }, [copyState]);

  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-600 text-left">
            <th className="py-2 px-3 text-slate-300 font-medium">Nome</th>
            <th className="py-2 px-3 text-slate-300 font-medium">Componente</th>
            <th className="py-2 px-3 text-slate-300 font-medium w-32">Ações</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="border-b border-slate-700">
              <td className="py-2 px-3 text-slate-200">{t.name}</td>
              <td className="py-2 px-3 text-slate-400 text-sm">{t.component_key}</td>
              <td className="py-2 px-3">
                <Button type="button" variant="outline" className="py-1 px-2 text-sm" onClick={() => setCopyModalSource(t)}>
                  Copiar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {templates.length === 0 && <p className="text-slate-500 py-4">Nenhum modelo.</p>}

      {copyModalSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-modal-title"
        >
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 id="copy-modal-title" className="text-lg font-semibold text-slate-100 mb-2">
              Copiar modelo «{copyModalSource.name}»
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Será criada uma nova entrada com o mesmo aspecto no menu. Indique o nome da cópia (deve ser único).
            </p>
            <form action={copyFormAction} className="space-y-4">
              <input type="hidden" name="source_id" value={copyModalSource.id} />
              <Input
                id="copy-new-name"
                name="new_name"
                label="Nome da nova cópia"
                type="text"
                required
                placeholder="ex: Modelo Restaurante 2"
                autoFocus
              />
              {copyState?.error && (
                <Alert variant="error">{copyState.error}</Alert>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setCopyModalSource(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Criar cópia
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
