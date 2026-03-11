"use client";

import { useFormState } from "react-dom";
import { createArticleType } from "../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { ARTICLE_TYPE_ICON_CODES, MenuIcon } from "@/components/menu-icons";
import { Input, Alert, SubmitButton } from "@/components/admin";

const ICON_LABELS: Record<(typeof ARTICLE_TYPE_ICON_CODES)[number], string> = {
  fish: "Peixe",
  meat: "Carne",
  seafood: "Marisco",
  veggie: "Vegetariano",
  "hot-spice": "Picante",
};

export function CreateArticleTypeForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useFormState(createArticleType, null);
  const [submitting, formBind] = useFormSubmitLoading(state);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end" {...formBind}>
      <input type="hidden" name="store_id" value={storeId} />
      <Input id="at-name" name="name" label="Nome" type="text" required placeholder="ex: Carne" />
      <ArticleTypeIconPicker name="icon_code" defaultValue="fish" />
      <Input id="at-sort" name="sort_order" label="Ordem" type="number" defaultValue={0} className="w-24" />
      <SubmitButton variant="primary" submitting={submitting} loadingText="A criar…">Criar tipo</SubmitButton>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}

export function ArticleTypeIconPicker({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const value = defaultValue ?? "fish";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-300">Ícone</span>
      <div className="flex gap-2 flex-wrap items-center" role="group" aria-label="Escolher ícone do tipo de artigo">
        {ARTICLE_TYPE_ICON_CODES.map((code) => (
          <label
            key={code}
            className="flex items-center cursor-pointer rounded-lg border-2 border-slate-600 bg-slate-800/80 p-2 hover:border-emerald-500 hover:bg-slate-700/80 has-[:checked]:border-emerald-500 has-[:checked]:ring-2 has-[:checked]:ring-emerald-500/50"
            title={ICON_LABELS[code]}
          >
            <input
              type="radio"
              name={name}
              value={code}
              defaultChecked={code === value}
              className="sr-only"
              aria-label={ICON_LABELS[code]}
            />
            <MenuIcon code={code} size={28} />
          </label>
        ))}
      </div>
    </div>
  );
}
