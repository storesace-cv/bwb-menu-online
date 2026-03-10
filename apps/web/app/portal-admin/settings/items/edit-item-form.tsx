"use client";

import { useFormState } from "react-dom";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateMenuItem, createCategoryAndReturnId } from "../../actions";
import { Input, Select, Button, Alert } from "@/components/admin";
import { GenerateDescriptionBlock } from "./generate-description-block";
import { AllergenChecklist, type AllergenOption } from "./allergen-checklist";

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
  prep_minutes: number | null;
  is_visible: boolean;
  is_featured: boolean;
  image_url?: string | null;
  image_path?: string | null;
  image_base_path?: string | null;
  has_image?: boolean;
  item_code?: string | null;
};

const MENU_IMAGES_BUCKET = "menu-images";

function imagePreviewUrl(item: MenuItem): string | null {
  const base = typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")
    : "";
  if (!base) return null;
  if (item.has_image && item.image_base_path) {
    return `${base}/storage/v1/object/public/${MENU_IMAGES_BUCKET}/${item.image_base_path}640.webp`;
  }
  if (item.image_url) return item.image_url;
  if (item.image_path) {
    return `${base}/storage/v1/object/public/${MENU_IMAGES_BUCKET}/${item.image_path}`;
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
  storeId,
  aiEnabled,
  allergens,
  selectedAllergenIds,
  familia,
  subFamilia,
  highlightCategoryId,
}: {
  item: MenuItem;
  articleTypes: ArticleType[];
  sections: Section[];
  categories: Category[];
  currentSectionId: string | null;
  currentCategoryId: string | null;
  storeId: string;
  aiEnabled: boolean;
  allergens: AllergenOption[];
  selectedAllergenIds: string[];
  familia: string | null;
  subFamilia: string | null;
  highlightCategoryId: string | null;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateMenuItem, null);
  const [isPromotion, setIsPromotion] = useState(item.is_promotion);
  const [sectionId, setSectionId] = useState<string>(currentSectionId ?? "");
  const [categoryId, setCategoryId] = useState<string>(highlightCategoryId ?? currentCategoryId ?? "");
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [createCategoryName, setCreateCategoryName] = useState(subFamilia ?? "");
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(null);
  const [createCategoryPending, setCreateCategoryPending] = useState(false);
  const nameRef = useRef<HTMLTextAreaElement>(null);
  const ingredientsRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const previewUrl = imagePreviewUrl(item);

  function handleFamiliaClick() {
    if (!sectionId) {
      alert("Seleccione primeiro uma secção.");
      return;
    }
    const familiaNorm = (familia ?? "").trim().toLowerCase();
    if (!familiaNorm) {
      alert("Este artigo não tem família definida na importação.");
      return;
    }
    const exists = categories.some(
      (c) => c.section_id === sectionId && (c.name ?? "").trim().toLowerCase() === familiaNorm
    );
    if (exists) {
      alert("Já existe uma categoria com o mesmo nome.");
      return;
    }
    setCreateCategoryName(subFamilia ?? "");
    setCreateCategoryError(null);
    setCreateCategoryModalOpen(true);
  }

  async function handleCreateCategoryConfirm() {
    const name = createCategoryName.trim();
    if (!name) {
      setCreateCategoryError("O nome da categoria é obrigatório.");
      return;
    }
    setCreateCategoryPending(true);
    setCreateCategoryError(null);
    try {
      const result = await createCategoryAndReturnId({ storeId, sectionId, name });
      if (result.error) {
        setCreateCategoryError(result.error);
        setCreateCategoryPending(false);
        return;
      }
      if (result.categoryId) {
        setCreateCategoryModalOpen(false);
        router.replace(`/portal-admin/settings/items/${item.id}/edit?highlightCategory=${result.categoryId}`);
      }
    } catch (e) {
      setCreateCategoryError("Erro ao criar a categoria. Tente novamente.");
    }
    setCreateCategoryPending(false);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-2xl">
      <input type="hidden" name="id" value={item.id} />

      {/* 0. Código do artigo (somente leitura) */}
      <div className="w-full">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Código do artigo
        </label>
        <p className="text-slate-200 text-sm py-1.5">{item.item_code ?? "—"}</p>
      </div>

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
          ref={nameRef}
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
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <label htmlFor="edit-desc" className="block text-sm font-medium text-slate-300">
            Descrição
          </label>
          <GenerateDescriptionBlock
            storeId={storeId}
            aiEnabled={aiEnabled}
            getCurrentName={() => nameRef.current?.value ?? ""}
            getCurrentIngredients={() => ingredientsRef.current?.value ?? ""}
            onApply={(s) => {
              if (descRef.current) descRef.current.value = s;
            }}
          />
        </div>
        <textarea
          ref={descRef}
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
          ref={ingredientsRef}
          id="edit-ingredients"
          name="menu_ingredients"
          rows={3}
          placeholder="Lista de ingredientes, uma por linha"
          defaultValue={item.menu_ingredients ?? ""}
          className={inputClass}
        />
      </div>

      {/* 4a. Alergénios */}
      <AllergenChecklist allergens={allergens} selectedIds={selectedAllergenIds} />

      {/* 4b. Familia + Secção, Sub familia + Categoria */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-slate-300 mb-1">Familia</label>
          <p className="text-slate-200 text-sm py-1.5">
            {(familia ?? "").trim() ? (
              <button
                type="button"
                onClick={handleFamiliaClick}
                className="underline cursor-pointer hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
              >
                {familia}
              </button>
            ) : (
              "—"
            )}
          </p>
        </div>
        <Select
          id="edit-section"
          name="section_id"
          label="Secção"
          value={sectionId}
          onChange={(e) => {
            const next = e.target.value;
            setSectionId(next);
            if (next) {
              const valid = categories.some((c) => c.id === categoryId && c.section_id === next);
              if (!valid) setCategoryId("");
            } else {
              setCategoryId("");
            }
          }}
        >
          <option value="">— Nenhuma —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-slate-300 mb-1">Sub familia</label>
          <p className="text-slate-200 text-sm py-1.5">{(subFamilia ?? "").trim() || "—"}</p>
        </div>
        <Select
          id="edit-category"
          name="category_id"
          label="Categoria"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— Nenhuma —</option>
          {sectionId
            ? categories.filter((c) => c.section_id === sectionId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            : null}
        </Select>
      </div>

      {/* 5. Ordem + Tipo de artigo + Tempo de Preparação */}
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
        <Input
          id="edit-prep-minutes"
          name="prep_minutes"
          label="Tempo de Preparação (min)"
          type="number"
          min={0}
          placeholder="opcional"
          defaultValue={item.prep_minutes ?? ""}
          className="w-28"
        />
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

      {/* Modal: Criar categoria a partir da sub familia */}
      {createCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !createCategoryPending && setCreateCategoryModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Criar categoria"
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-slate-100 mb-2">Criar nova categoria</h3>
            <p className="text-slate-400 text-sm mb-4">
              Será criada uma nova categoria na secção seleccionada. Pode corrigir o nome abaixo.
            </p>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nome da categoria
            </label>
            <input
              type="text"
              value={createCategoryName}
              onChange={(e) => setCreateCategoryName(e.target.value)}
              className={inputClass}
              placeholder="ex: Entradas"
              disabled={createCategoryPending}
            />
            {createCategoryError && (
              <p className="mt-2 text-sm text-red-400">{createCategoryError}</p>
            )}
            <div className="flex gap-3 mt-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => !createCategoryPending && setCreateCategoryModalOpen(false)}
                disabled={createCategoryPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateCategoryConfirm}
                disabled={createCategoryPending}
              >
                {createCategoryPending ? "A criar…" : "Criar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
