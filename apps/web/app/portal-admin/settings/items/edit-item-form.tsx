"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import { updateMenuItem } from "../../actions";
import { Input, Select, Button, Alert } from "@/components/admin";

const inputClass =
  "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500";

type ArticleType = { id: string; name: string; icon_code: string };
type Section = { id: string; name: string };
type Category = { id: string; name: string; section_id: string | null };

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
  image_url?: string | null;
  image_path?: string | null;
};

function imagePreviewUrl(item: MenuItem): string | null {
  if (item.image_url) return item.image_url;
  if (item.image_path && typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
    return `${base}/storage/v1/object/public/${item.image_path}`;
  }
  return null;
}

export function EditItemForm({
  item,
  articleTypes,
  sections,
  categories,
  currentSectionId,
  currentCategoryId,
}: {
  item: MenuItem;
  articleTypes: ArticleType[];
  sections: Section[];
  categories: Category[];
  currentSectionId: string | null;
  currentCategoryId: string | null;
}) {
  const [state, formAction] = useFormState(updateMenuItem, null);
  const [isPromotion, setIsPromotion] = useState(item.is_promotion);

  const previewUrl = imagePreviewUrl(item);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-2xl">
      <input type="hidden" name="id" value={item.id} />

      {/* 1. Imagem */}
      <div className="w-full">
        <label htmlFor="edit-image" className="block text-sm font-medium text-slate-300 mb-1">
          Imagem
        </label>
        <input
          id="edit-image"
          name="image_url"
          type="url"
          placeholder="URL da imagem (opcional)"
          defaultValue={item.image_url ?? ""}
          className={inputClass}
        />
        {previewUrl && (
          <div className="mt-2">
            <img
              src={previewUrl}
              alt="Pré-visualização"
              className="h-24 w-24 object-cover rounded-lg border border-slate-700"
            />
          </div>
        )}
      </div>

      {/* 2. Nome */}
      <div className="w-full">
        <label htmlFor="edit-name" className="block text-sm font-medium text-slate-300 mb-1">
          Nome *
        </label>
        <textarea
          id="edit-name"
          name="menu_name"
          required
          rows={2}
          placeholder="ex: Bifana"
          defaultValue={item.menu_name}
          className={inputClass}
        />
      </div>

      {/* 3. Descrição */}
      <div className="w-full">
        <label htmlFor="edit-desc" className="block text-sm font-medium text-slate-300 mb-1">
          Descrição
        </label>
        <textarea
          id="edit-desc"
          name="menu_description"
          rows={3}
          placeholder="Breve descrição"
          defaultValue={item.menu_description ?? ""}
          className={inputClass}
        />
      </div>

      {/* 4. Ingredientes */}
      <div className="w-full">
        <label htmlFor="edit-ingredients" className="block text-sm font-medium text-slate-300 mb-1">
          Ingredientes (texto expansível no menu)
        </label>
        <textarea
          id="edit-ingredients"
          name="menu_ingredients"
          rows={3}
          placeholder="Lista de ingredientes, uma por linha"
          defaultValue={item.menu_ingredients ?? ""}
          className={inputClass}
        />
      </div>

      {/* 4b. Secção + Categoria (mesma linha) */}
      <div className="flex flex-wrap gap-4 items-end">
        <Select
          id="edit-section"
          name="section_id"
          label="Secção"
          defaultValue={currentSectionId ?? ""}
        >
          <option value="">— Nenhuma —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          id="edit-category"
          name="category_id"
          label="Categoria"
          defaultValue={currentCategoryId ?? ""}
        >
          <option value="">— Nenhuma —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* 5. Ordem + Tipo de artigo */}
      <div className="flex flex-wrap gap-4 items-end">
        <Input
          id="edit-sort"
          name="sort_order"
          label="Ordem"
          type="number"
          defaultValue={item.sort_order}
          className="w-24"
        />
        <Select
          id="edit-type"
          name="article_type_id"
          label="Tipo de artigo"
          defaultValue={item.article_type_id ?? ""}
        >
          <option value="">Nenhum</option>
          {articleTypes.map((at) => (
            <option key={at.id} value={at.id}>
              {at.name}
            </option>
          ))}
        </Select>
      </div>

      {/* 6. Visível, Destaque, Take-away, Em promoção */}
      <div className="flex flex-wrap gap-6 items-center">
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input
            type="checkbox"
            name="is_visible"
            value="1"
            defaultChecked={item.is_visible}
            className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
          />
          Visível no menu
        </label>
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input
            type="checkbox"
            name="is_featured"
            value="1"
            defaultChecked={item.is_featured}
            className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
          />
          Destaque
        </label>
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input
            type="checkbox"
            name="take_away"
            value="1"
            defaultChecked={item.take_away}
            className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
          />
          Take-away
        </label>
        <label className="flex items-center gap-2 text-slate-300 text-sm">
          <input
            type="checkbox"
            name="is_promotion"
            value="1"
            defaultChecked={item.is_promotion}
            onChange={(e) => setIsPromotion(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
          />
          Em promoção
        </label>
      </div>

      {/* 7. Preço + Preço antigo (condicional) */}
      <div className="flex flex-wrap gap-4 items-end">
        <Input
          id="edit-price"
          name="menu_price"
          label="Preço"
          type="number"
          step="0.01"
          min={0}
          placeholder="0.00"
          defaultValue={item.menu_price ?? ""}
          className="w-32"
        />
        {isPromotion ? (
          <Input
            id="edit-price-old"
            name="price_old"
            label="Preço antigo *"
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            defaultValue={item.price_old ?? ""}
            required
            className="w-32"
          />
        ) : (
          <input type="hidden" name="price_old" value="" />
        )}
      </div>

      {/* 8. Mensagem de sucesso */}
      {state?.success && (
        <Alert variant="success">Alterações guardadas.</Alert>
      )}

      {/* 9. Botões */}
      <div className="flex flex-wrap gap-3 items-center">
        <Link
          href="/portal-admin/settings/items"
          className="px-4 py-2 border border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500"
        >
          Cancelar
        </Link>
        <Button type="submit" variant="primary">
          Guardar
        </Button>
      </div>

      {/* 10. Mensagem de erro */}
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
