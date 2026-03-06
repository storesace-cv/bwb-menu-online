"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { updateSection, deleteSection } from "../../actions";
import { Input, Button, Alert } from "@/components/admin";

type Section = { id: string; name: string; sort_order: number };

export function SectionRow({ section }: { section: Section }) {
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

  return (
    <li className="flex items-center gap-3 py-4 border-b border-slate-700 last:border-b-0">
      <span className="text-slate-200 font-medium">{section.name}</span>
      <span className="text-slate-500 text-sm">ordem {section.sort_order}</span>
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
