"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { updateCategory, deleteCategory } from "../../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Select, Button, Alert, SubmitButton } from "@/components/admin";

type PresentationTemplate = { id: string; name: string };
type Section = { id: string; name: string; sort_order: number };
type Category = { id: string; name: string; sort_order: number; section_id: string | null; presentation_template_id?: string | null };

export function CategoryRow({
  category,
  sections,
  presentationTemplates,
  showTreePrefix = false,
}: {
  category: Category;
  sections: Section[];
  presentationTemplates: PresentationTemplate[];
  showTreePrefix?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateFormAction] = useFormState(updateCategory, null);
  const [updateSubmitting, updateFormBind] = useFormSubmitLoading(updateState);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const handleDeleteClick = () => {
    if (!confirm(`Apagar a categoria «${category.name}»? Os itens deixarão de estar associados a esta categoria.`)) return;
    deleteFormRef.current?.requestSubmit();
  };

  const sectionName = category.section_id
    ? sections.find((s) => s.id === category.section_id)?.name ?? "—"
    : "—";
  const templateName = category.presentation_template_id
    ? presentationTemplates.find((t) => t.id === category.presentation_template_id)?.name ?? "—"
    : "—";

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-4 py-4 border-b border-slate-700 last:border-b-0">
        <form action={updateFormAction} className="flex gap-4 flex-wrap items-center" {...updateFormBind}>
          <input type="hidden" name="id" value={category.id} />
          <Input id={`edit-cat-name-${category.id}`} name="name" label="Nome" type="text" required defaultValue={category.name} className="min-w-[8rem]" wrapperClassName="mb-0" />
          <Select id={`edit-cat-section-${category.id}`} name="section_id" label="Secção" wrapperClassName="mb-0" defaultValue={category.section_id ?? ""} required>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select id={`edit-cat-template-${category.id}`} name="presentation_template_id" label="Modelo de apresentação" wrapperClassName="mb-0" defaultValue={category.presentation_template_id ?? ""}>
            <option value="">Nenhum</option>
            {presentationTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <Input id={`edit-cat-sort-${category.id}`} name="sort_order" label="Ordem" type="number" defaultValue={category.sort_order} className="w-24" wrapperClassName="mb-0" />
          <SubmitButton variant="primary" submitting={updateSubmitting} loadingText="A guardar…">Guardar</SubmitButton>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
        </form>
        {updateState?.error && (
          <div className="w-full mt-2">
            <Alert variant="error">{updateState.error}</Alert>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-4 border-b border-slate-700 last:border-b-0">
      {showTreePrefix && (
        <span className="font-mono text-sm whitespace-pre text-slate-500">      |-----→    </span>
      )}
      <span className="text-slate-200 font-medium">{category.name}</span>
      <span className="text-slate-500 text-sm">secção: {sectionName}</span>
      <span className="text-slate-500 text-sm">modelo: {templateName}</span>
      <span className="text-slate-500 text-sm">ordem {category.sort_order}</span>
      <Button type="button" variant="outline" onClick={() => setEditing(true)} className="py-1 px-2 text-sm ml-2">
        Editar
      </Button>
      <form ref={deleteFormRef} action={(fd: FormData) => { void deleteCategory(null, fd); }} className="inline">
        <input type="hidden" name="id" value={category.id} />
        <Button type="button" variant="danger" onClick={handleDeleteClick} className="py-1 px-2 text-sm">
          Apagar
        </Button>
      </form>
    </li>
  );
}
