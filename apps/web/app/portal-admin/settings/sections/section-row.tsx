"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { updateSection, deleteSection } from "../../actions";
import { Input, Select, Button, Alert } from "@/components/admin";

type PresentationTemplate = { id: string; name: string };
type Section = { id: string; name: string; sort_order: number; presentation_template_id?: string | null };

export function SectionRow({ section, presentationTemplates }: { section: Section; presentationTemplates: PresentationTemplate[] }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateFormAction] = useFormState(updateSection, null);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const handleDeleteClick = () => {
    if (!confirm(`Apagar a secção «${section.name}»? Só é possível se não tiver categorias associadas.`)) return;
    deleteFormRef.current?.requestSubmit();
  };

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-4 py-4 border-b border-slate-700 last:border-b-0">
        <form action={updateFormAction} className="flex gap-4 flex-wrap items-center">
          <input type="hidden" name="id" value={section.id} />
          <Input id={`edit-sec-name-${section.id}`} name="name" label="Nome" type="text" required defaultValue={section.name} className="min-w-[8rem]" wrapperClassName="mb-0" />
          <Input id={`edit-sec-sort-${section.id}`} name="sort_order" label="Ordem" type="number" defaultValue={section.sort_order} className="w-24" wrapperClassName="mb-0" />
          <Select id={`edit-sec-template-${section.id}`} name="presentation_template_id" label="Modelo de apresentação" wrapperClassName="mb-0" defaultValue={section.presentation_template_id ?? ""}>
            <option value="">Nenhum</option>
            {presentationTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="primary">Guardar</Button>
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

  const templateName = section.presentation_template_id
    ? presentationTemplates.find((t) => t.id === section.presentation_template_id)?.name ?? "—"
    : "—";

  return (
    <li className="flex items-center gap-3 py-4 border-b border-slate-700 last:border-b-0">
      <span className="text-slate-200 font-medium">{section.name}</span>
      <span className="text-slate-500 text-sm">ordem {section.sort_order}</span>
      <span className="text-slate-500 text-sm">modelo: {templateName}</span>
      <Button type="button" variant="outline" onClick={() => setEditing(true)} className="py-1 px-2 text-sm ml-2">
        Editar
      </Button>
      <form ref={deleteFormRef} action={(fd: FormData) => { void deleteSection(null, fd); }} className="inline">
        <input type="hidden" name="id" value={section.id} />
        <Button type="button" variant="danger" onClick={handleDeleteClick} className="py-1 px-2 text-sm">
          Apagar
        </Button>
      </form>
    </li>
  );
}
