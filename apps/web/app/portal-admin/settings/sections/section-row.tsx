"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { updateSection, deleteSection, setSectionAsDefault } from "../../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Select, Button, Alert, ColorPickerField, SubmitButton } from "@/components/admin";

type PresentationTemplate = { id: string; name: string };
type Section = {
  id: string;
  name: string;
  sort_order: number;
  presentation_template_id?: string | null;
  background_color?: string | null;
  background_css?: string | null;
  is_default?: boolean;
};

export function SectionRow({
  section,
  presentationTemplates,
}: {
  section: Section;
  presentationTemplates: PresentationTemplate[];
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateFormAction] = useFormState(updateSection, null);
  const [defaultState, defaultFormAction] = useFormState(setSectionAsDefault, null);
  const [updateSubmitting, updateFormBind] = useFormSubmitLoading(updateState);
  const [defaultSubmitting, defaultFormBind] = useFormSubmitLoading(defaultState);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const handleDeleteClick = () => {
    if (!confirm(`Apagar a secção «${section.name}»? Só é possível se não tiver categorias associadas.`)) return;
    deleteFormRef.current?.requestSubmit();
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-start gap-4 py-4">
        <form action={updateFormAction} className="flex flex-col gap-4 flex-1 min-w-0" {...updateFormBind}>
          <input type="hidden" name="id" value={section.id} />
          <div className="flex gap-4 flex-wrap items-end">
            <Input id={`edit-sec-name-${section.id}`} name="name" label="Nome" type="text" required defaultValue={section.name} className="min-w-[8rem]" wrapperClassName="mb-0" />
            <Input id={`edit-sec-sort-${section.id}`} name="sort_order" label="Ordem" type="number" defaultValue={section.sort_order} className="w-24" wrapperClassName="mb-0" />
            <Select id={`edit-sec-template-${section.id}`} name="presentation_template_id" label="Modelo de apresentação" wrapperClassName="mb-0" defaultValue={section.presentation_template_id ?? ""}>
              <option value="">Nenhum</option>
              {presentationTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <SubmitButton variant="primary" submitting={updateSubmitting} loadingText="A guardar…">Guardar</SubmitButton>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
          <ColorPickerField
            id={`edit-sec-bg-${section.id}`}
            name="background_color"
            label="Cor de fundo da secção"
            defaultValue={section.background_color ?? ""}
            defaultHex="#F2F2F2"
            placeholder="#F2F2F2"
            allowEmpty
          />
          <div className="flex flex-col gap-2">
            <label htmlFor={`edit-sec-bg-css-${section.id}`} className="text-sm font-medium text-slate-300">
              CSS de fundo (opcional)
            </label>
            <textarea
              id={`edit-sec-bg-css-${section.id}`}
              name="background_css"
              rows={2}
              defaultValue={section.background_css ?? ""}
              placeholder="ex: linear-gradient(...)"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 font-mono"
            />
            <p className="text-xs text-slate-500">Se preenchido, substitui a cor sólida acima. Gradientes: <a href="https://webgradients.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-300 underline">webgradients.com</a></p>
          </div>
          {updateState?.error && (
            <Alert variant="error">{updateState.error}</Alert>
          )}
        </form>
      </div>
    );
  }

  const templateName = section.presentation_template_id
    ? presentationTemplates.find((t) => t.id === section.presentation_template_id)?.name ?? "—"
    : "—";

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-slate-200 font-medium">{section.name}</span>
        {section.is_default && (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
            Apresentada por defeito
          </span>
        )}
        <span className="text-slate-500 text-sm">ordem {section.sort_order}</span>
        <span className="text-slate-500 text-sm">modelo: {templateName}</span>
        {!section.is_default && (
          <form action={defaultFormAction} className="inline" {...defaultFormBind}>
            <input type="hidden" name="sectionId" value={section.id} />
            <SubmitButton variant="outline" submitting={defaultSubmitting} loadingText="A aplicar…" className="py-1 px-2 text-sm">
              Definir como apresentada por defeito
            </SubmitButton>
          </form>
        )}
        <Button type="button" variant="outline" onClick={() => setEditing(true)} className="py-1 px-2 text-sm ml-2">
          Editar
        </Button>
        <form ref={deleteFormRef} action={(fd: FormData) => { void deleteSection(null, fd); }} className="inline">
          <input type="hidden" name="id" value={section.id} />
          <Button type="button" variant="danger" onClick={handleDeleteClick} className="py-1 px-2 text-sm">
            Apagar
          </Button>
        </form>
      </div>
      {defaultState?.error && (
        <Alert variant="error" className="mt-2">{defaultState.error}</Alert>
      )}
    </div>
  );
}
