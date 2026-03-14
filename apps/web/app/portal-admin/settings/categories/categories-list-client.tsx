"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  sortSectionCategoriesAlphabetically,
  reorderCategories,
  reorderSections,
} from "../../actions";
import { deleteCategory } from "../../actions";
import { CategoryRow } from "./category-row";
import { Button } from "@/components/admin";

export type SectionItem = { id: string; name: string; sort_order: number };
export type CategoryItem = {
  id: string;
  name: string;
  sort_order: number;
  section_id: string | null;
  presentation_template_id?: string | null;
  sample_image_id?: string | null;
};
type PresentationTemplate = { id: string; name: string };
type ImageSample = { id: string; name: string | null };

type Props = {
  sections: SectionItem[];
  categoriesBySectionId: Record<string, CategoryItem[]>;
  uncategorized: CategoryItem[];
  presentationTemplates: PresentationTemplate[];
  imageSamples: ImageSample[];
};

function SortableSectionCard({
  section,
  sectionCategories,
  sections,
  presentationTemplates,
  imageSamples,
  onOrdenar,
  isOrdenarPending,
}: {
  section: SectionItem;
  sectionCategories: CategoryItem[];
  sections: SectionItem[];
  presentationTemplates: PresentationTemplate[];
  imageSamples: ImageSample[];
  onOrdenar: (sectionId: string) => void;
  isOrdenarPending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const categoryIds = sectionCategories.map((c) => c.id);

  const router = useRouter();

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categoryIds.indexOf(active.id as string);
    const newIndex = categoryIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(categoryIds, oldIndex, newIndex);
    const fd = new FormData();
    fd.set("sectionId", section.id);
    fd.set("categoryIds", JSON.stringify(newOrder));
    reorderCategories(null, fd).then(() => router.refresh());
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full bg-slate-800 border border-slate-600 rounded-xl p-4 ${isDragging ? "opacity-70 z-10 shadow-lg" : ""}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none p-1 text-slate-400 hover:text-slate-300 rounded"
            {...listeners}
            {...attributes}
            aria-label="Arrastar secção"
          >
            <span className="font-mono text-lg leading-none">⋮⋮</span>
          </button>
          <h3 className="text-slate-200 font-medium m-0">{section.name}</h3>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOrdenar(section.id)}
          disabled={isOrdenarPending}
          className="py-1 px-2 text-sm"
        >
          Ordenar
        </Button>
      </div>
      <div className="mt-3 ml-4 space-y-2">
        <CategoryDndContext
          categoryIds={categoryIds}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext
            items={categoryIds}
            strategy={verticalListSortingStrategy}
          >
            {sectionCategories.map((c) => (
              <SortableCategoryCard
                key={c.id}
                category={c}
                sections={sections}
                presentationTemplates={presentationTemplates}
                imageSamples={imageSamples}
              />
            ))}
          </SortableContext>
        </CategoryDndContext>
      </div>
    </div>
  );
}

function CategoryDndContext({
  categoryIds,
  onDragEnd,
  children,
}: {
  categoryIds: string[];
  onDragEnd: (event: DragEndEvent) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={categoryIds}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

function SortableCategoryCard({
  category,
  sections,
  presentationTemplates,
  imageSamples,
}: {
  category: CategoryItem;
  sections: SectionItem[];
  presentationTemplates: PresentationTemplate[];
  imageSamples: ImageSample[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId === category.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDeleteClick = () => {
    if (!confirm(`Apagar a categoria «${category.name}»? Os itens deixarão de estar associados a esta categoria.`)) return;
    (document.getElementById(`delete-category-form-${category.id}`) as HTMLFormElement)?.requestSubmit();
  };

  return (
    <div className="flex gap-2 items-start w-full">
      <div
        ref={setNodeRef}
        style={style}
        className={`flex-1 min-w-0 bg-slate-700/90 border border-slate-600 rounded-lg p-3 ${isDragging ? "opacity-80 z-20 shadow-md" : ""}`}
      >
        <div className="flex gap-2 items-start">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none p-1 text-slate-400 hover:text-slate-300 rounded shrink-0"
            {...listeners}
            {...attributes}
            aria-label="Arrastar categoria"
          >
            <span className="font-mono text-sm leading-none">⋮⋮</span>
          </button>
          <div className="flex-1 min-w-0">
            <CategoryRow
              category={category}
              sections={sections}
              presentationTemplates={presentationTemplates}
              imageSamples={imageSamples}
              contentOnly
              editing={isEditing}
              onEditClick={() => setEditingId(category.id)}
              onCancelClick={() => setEditingId(null)}
            />
          </div>
        </div>
      </div>
      {!isEditing && (
        <div className="flex gap-2 shrink-0 items-start">
          <Button type="button" variant="outline" onClick={() => setEditingId(category.id)} className="py-1 px-2 text-sm">
            Editar
          </Button>
          <form id={`delete-category-form-${category.id}`} action={(fd: FormData) => { void deleteCategory(null, fd); }} className="inline">
            <input type="hidden" name="id" value={category.id} />
            <Button type="button" variant="danger" onClick={handleDeleteClick} className="py-1 px-2 text-sm">
              Apagar
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export function CategoriesListClient({
  sections,
  categoriesBySectionId,
  uncategorized,
  presentationTemplates,
  imageSamples,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sectionIds = sections.map((s) => s.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleOrdenar = (sectionId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sectionId", sectionId);
      await sortSectionCategoriesAlphabetically(null, fd);
      router.refresh();
    });
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionIds.indexOf(active.id as string);
    const newIndex = sectionIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(sectionIds, oldIndex, newIndex);
    const fd = new FormData();
    fd.set("sectionIds", JSON.stringify(newOrder));
    reorderSections(null, fd).then(() => router.refresh());
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleSectionDragEnd}
    >
      <SortableContext
        items={sectionIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4" aria-label="Categorias agrupadas por secção">
          {sections.map((s) => {
            const sectionCategories = categoriesBySectionId[s.id] ?? [];
            if (sectionCategories.length === 0) return null;
            return (
              <SortableSectionCard
                key={s.id}
                section={s}
                sectionCategories={sectionCategories}
                sections={sections}
                presentationTemplates={presentationTemplates}
                imageSamples={imageSamples}
                onOrdenar={handleOrdenar}
                isOrdenarPending={isPending}
              />
            );
          })}
          {uncategorized.length > 0 && (
            <div className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4">
              <h3 className="text-slate-200 font-medium m-0">Sem secção</h3>
              <div className="mt-3 ml-4 space-y-2">
                {uncategorized.map((c) => (
                  <div
                    key={c.id}
                    className="w-full bg-slate-700/90 border border-slate-600 rounded-lg p-3"
                  >
                    <CategoryRow
                      category={c}
                      sections={sections}
                      presentationTemplates={presentationTemplates}
                      imageSamples={imageSamples}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}