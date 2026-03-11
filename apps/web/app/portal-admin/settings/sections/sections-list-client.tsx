"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { sortSectionsAlphabetically, reorderSections } from "../../actions";
import { SectionRow } from "./section-row";
import { Button } from "@/components/admin";

export type SectionItem = {
  id: string;
  name: string;
  sort_order: number;
  presentation_template_id?: string | null;
  background_color?: string | null;
  background_css?: string | null;
  is_default?: boolean;
};

type CategoryItem = { id: string; name: string };
type PresentationTemplate = { id: string; name: string };

type Props = {
  sections: SectionItem[];
  categoriesBySectionId: Record<string, CategoryItem[]>;
  presentationTemplates: PresentationTemplate[];
  storeId: string;
};

function SortableSectionCard({
  section,
  categories,
  presentationTemplates,
}: {
  section: SectionItem;
  categories: CategoryItem[];
  presentationTemplates: PresentationTemplate[];
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full bg-slate-800 border border-slate-600 rounded-xl p-4 ${isDragging ? "opacity-70 z-10 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-1 text-slate-400 hover:text-slate-300 rounded shrink-0 mt-0.5"
          {...listeners}
          {...attributes}
          aria-label="Arrastar secção"
        >
          <span className="font-mono text-lg leading-none">⋮⋮</span>
        </button>
        <div className="flex-1 min-w-0">
          <SectionRow section={section} presentationTemplates={presentationTemplates} />
        </div>
      </div>
      {categories.length > 0 && (
        <div className="mt-3 ml-4 space-y-2" aria-label="Categorias desta secção">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="w-full bg-slate-700/90 border border-slate-600 rounded-lg p-3 text-slate-200"
            >
              {cat.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionsListClient({
  sections,
  categoriesBySectionId,
  presentationTemplates,
  storeId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sectionIds = sections.map((s) => s.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleOrdenar = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("storeId", storeId);
      await sortSectionsAlphabetically(null, fd);
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
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleOrdenar}
          disabled={isPending}
          className="py-1 px-2 text-sm"
        >
          Ordenar secções
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sectionIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4" aria-label="Lista de secções">
            {sections.map((s) => (
              <SortableSectionCard
                key={s.id}
                section={s}
                categories={categoriesBySectionId[s.id] ?? []}
                presentationTemplates={presentationTemplates}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
