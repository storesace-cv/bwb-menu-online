"use client";

import { useFormState } from "react-dom";
import { createMenuItem } from "../../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Select, Alert, SubmitButton } from "@/components/admin";
import { GenerateDescriptionBlock } from "./generate-description-block";
import { AllergenChecklist, type AllergenOption } from "./allergen-checklist";

const inputClass =
  "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500";

type ArticleType = { id: string; name: string; icon_code: string };

export function CreateItemForm({
  storeId,
  articleTypes,
  aiEnabled = false,
  allergens = [],
}: {
  storeId: string;
  articleTypes: ArticleType[];
  aiEnabled?: boolean;
  allergens?: AllergenOption[];
}) {
  const [state, formAction] = useFormState(createMenuItem, null);
  const [submitting, formBind] = useFormSubmitLoading(state);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-2xl" {...formBind}>
      <input type="hidden" name="store_id" value={storeId} />
      <div className="flex flex-wrap gap-4">
        <Input id="item-name" name="menu_name" label="Nome *" type="text" required placeholder="ex: Bifana" />
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <label htmlFor="item-desc" className="block text-sm font-medium text-slate-300">
              Descrição
            </label>
            <GenerateDescriptionBlock
              storeId={storeId}
              aiEnabled={aiEnabled}
              getCurrentName={() => (document.getElementById("item-name") as HTMLInputElement)?.value ?? ""}
              getCurrentIngredients={() => (document.getElementById("item-ingredients") as HTMLTextAreaElement)?.value ?? ""}
              onApply={(s) => {
                const el = document.getElementById("item-desc");
                if (el && "value" in el) (el as HTMLInputElement).value = s;
              }}
            />
          </div>
          <input
            id="item-desc"
            name="menu_description"
            type="text"
            placeholder="Breve descrição"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <Input id="item-price" name="menu_price" label="Preço" type="number" step="0.01" min={0} placeholder="0.00" />
        <Select id="item-type" name="article_type_id" label="Tipo de artigo">
          <option value="">Nenhum</option>
          {articleTypes.map((at) => (
            <option key={at.id} value={at.id}>{at.name}</option>
          ))}
        </Select>
        <Input id="item-sort" name="sort_order" label="Ordem" type="number" defaultValue={0} className="w-24" />
        <Input id="item-prep-minutes" name="prep_minutes" label="Tempo de Preparação (min)" type="number" min={0} placeholder="opcional" className="w-28" />
      </div>
      <div className="flex flex-wrap gap-6 items-center">
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="is_promotion" value="1" className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Em promoção
        </label>
        <div className="flex items-end gap-2">
          <Input id="item-price-old" name="price_old" label="Preço antigo" type="number" step="0.01" min={0} placeholder="0.00" className="w-28" />
        </div>
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="take_away" value="1" className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Take-away
        </label>
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="is_dish_of_the_day" value="1" className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Prato do Dia
        </label>
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="is_wine" value="1" className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Vinho
        </label>
      </div>
      <div>
        <label htmlFor="item-ingredients" className="block text-sm font-medium text-slate-300 mb-1">Ingredientes (texto expansível no menu)</label>
        <textarea
          id="item-ingredients"
          name="menu_ingredients"
          rows={2}
          placeholder="Lista de ingredientes, uma por linha"
          className={inputClass}
        />
      </div>
      <AllergenChecklist allergens={allergens} selectedIds={[]} />
      <SubmitButton variant="primary" submitting={submitting} loadingText="A criar…">Criar item</SubmitButton>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
