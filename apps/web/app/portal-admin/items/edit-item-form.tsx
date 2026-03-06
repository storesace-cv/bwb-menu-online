"use client";

import { useFormState } from "react-dom";
import { updateMenuItem } from "../actions";
import { Input, Select, Button, Alert } from "@/components/admin";

const inputClass =
  "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500";

type ArticleType = { id: string; name: string; icon_code: string };

type MenuItem = {
  id: string;
  menu_name: string;
  menu_description: string | null;
  menu_price: number | null;
  sort_order: number;
  article_type_id: string | null;
  is_promotion: boolean;
  price_old: number | null;
  take_away: boolean;
  menu_ingredients: string | null;
  is_visible: boolean;
  is_featured: boolean;
};

export function EditItemForm({ item, articleTypes }: { item: MenuItem; articleTypes: ArticleType[] }) {
  const [state, formAction] = useFormState(updateMenuItem, null);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-2xl">
      <input type="hidden" name="id" value={item.id} />
      <div className="flex flex-wrap gap-4">
        <Input id="edit-name" name="menu_name" label="Nome *" type="text" required defaultValue={item.menu_name} placeholder="ex: Bifana" />
        <Input id="edit-desc" name="menu_description" label="Descrição" type="text" defaultValue={item.menu_description ?? ""} placeholder="Breve descrição" />
      </div>
      <div className="flex flex-wrap gap-4">
        <Input id="edit-price" name="menu_price" label="Preço" type="number" step="0.01" min={0} placeholder="0.00" defaultValue={item.menu_price ?? ""} />
        <Select id="edit-type" name="article_type_id" label="Tipo de artigo" defaultValue={item.article_type_id ?? ""}>
          <option value="">Nenhum</option>
          {articleTypes.map((at) => (
            <option key={at.id} value={at.id}>{at.name}</option>
          ))}
        </Select>
        <Input id="edit-sort" name="sort_order" label="Ordem" type="number" defaultValue={item.sort_order} className="w-24" />
      </div>
      <div className="flex flex-wrap gap-6 items-center">
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="is_promotion" value="1" defaultChecked={item.is_promotion} className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Em promoção
        </label>
        <Input id="edit-price-old" name="price_old" label="Preço antigo" type="number" step="0.01" min={0} placeholder="0.00" defaultValue={item.price_old ?? ""} className="w-28" />
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="take_away" value="1" defaultChecked={item.take_away} className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Take-away
        </label>
      </div>
      <div className="flex flex-wrap gap-6 items-center">
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="is_visible" value="1" defaultChecked={item.is_visible} className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Visível no menu
        </label>
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" name="is_featured" value="1" defaultChecked={item.is_featured} className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
          Destaque
        </label>
      </div>
      <div>
        <label htmlFor="edit-ingredients" className="block text-sm font-medium text-slate-300 mb-1">Ingredientes (texto expansível no menu)</label>
        <textarea
          id="edit-ingredients"
          name="menu_ingredients"
          rows={2}
          placeholder="Lista de ingredientes, uma por linha"
          defaultValue={item.menu_ingredients ?? ""}
          className={inputClass}
        />
      </div>
      <Button type="submit" variant="primary">Guardar</Button>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
