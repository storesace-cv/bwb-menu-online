"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { updateCategory, deleteCategory } from "../../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Select, Button, Alert, SubmitButton } from "@/components/admin";

type PresentationTemplate = { id: string; name: string };
type Section = { id: string; name: string; sort_order: number };
type ImageSample = { id: string; name: string | null };
type Category = { id: string; name: string; sort_order: number; section_id: string | null; presentation_template_id?: string | null; sample_image_id?: string | null };

export function CategoryRow({
  category,
  sections,
  presentationTemplates,
  imageSamples = [],
  storeId,
  contentOnly,
  editing: controlledEditing,
  onEditClick,
  onCancelClick,
}: {
  category: Category;
  sections: Section[];
  presentationTemplates: PresentationTemplate[];
  imageSamples?: ImageSample[];
  /** Store id for upload; when set, shows "Carregar imagem sample" in edit mode. */
  storeId?: string;
  /** When true, only render content (no buttons); parent renders buttons outside. */
  contentOnly?: boolean;
  /** When contentOnly, controlled editing state. */
  editing?: boolean;
  /** When contentOnly, called when Editar is clicked. */
  onEditClick?: () => void;
  /** When contentOnly, called when Cancelar is clicked. */
  onCancelClick?: () => void;
}) {
  const router = useRouter();
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = contentOnly ? (controlledEditing ?? false) : internalEditing;
  const setEditing = contentOnly
    ? (value: boolean) => { if (value) onEditClick?.(); else onCancelClick?.(); }
    : setInternalEditing;
  const [updateState, updateFormAction] = useFormState(updateCategory, null);
  useEffect(() => {
    if (contentOnly && updateState && !updateState.error) onCancelClick?.();
  }, [contentOnly, updateState, onCancelClick]);
  const [updateSubmitting, updateFormBind] = useFormSubmitLoading(updateState);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const [selectedSampleId, setSelectedSampleId] = useState(category.sample_image_id ?? "");
  const [newSamples, setNewSamples] = useState<ImageSample[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      setSelectedSampleId(category.sample_image_id ?? "");
    }
  }, [editing, category.sample_image_id]);

  const allSamples = [...imageSamples, ...newSamples];

  const handleUploadSample = async () => {
    const input = fileInputRef.current;
    if (!storeId || !input?.files?.length) return;
    const file = input.files[0];
    if (!file || file.size === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("store_id", storeId);
      const res = await fetch("/api/portal-admin/settings/image-samples/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error ?? `Erro ${res.status}`);
        return;
      }
      const newSample: ImageSample = { id: data.id, name: data.name ?? null };
      setNewSamples((prev) => [...prev, newSample]);
      setSelectedSampleId(data.id);
      input.value = "";
      router.refresh();
    } finally {
      setUploading(false);
    }
  };

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
  const sampleName = category.sample_image_id
    ? imageSamples.find((s) => s.id === category.sample_image_id)?.name ?? "—"
    : "—";

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-4 py-4 border-b border-slate-700 last:border-b-0">
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
          <div className="flex flex-wrap items-end gap-2 mb-0">
            <Select
              id={`edit-cat-sample-${category.id}`}
              name="sample_image_id"
              label="Imagem sample"
              wrapperClassName="mb-0"
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
            >
              <option value="">Nenhuma</option>
              {allSamples.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </Select>
            {storeId && (
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-sm text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-emerald-700 file:text-slate-100 file:text-sm"
                  aria-label="Ficheiro da imagem sample"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadSample}
                  disabled={uploading}
                  className="py-1 px-2 text-sm"
                >
                  {uploading ? "A carregar…" : "Carregar imagem sample"}
                </Button>
              </div>
            )}
          </div>
          {uploadError && (
            <div className="w-full mt-1">
              <Alert variant="error">{uploadError}</Alert>
            </div>
          )}
          <Input id={`edit-cat-sort-${category.id}`} name="sort_order" label="Ordem" type="number" defaultValue={category.sort_order} className="w-24" wrapperClassName="mb-0" />
          <SubmitButton variant="primary" submitting={updateSubmitting} loadingText="A guardar…">Guardar</SubmitButton>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
        </form>
        {updateState?.error && (
          <div className="w-full mt-2">
            <Alert variant="error">{updateState.error}</Alert>
          </div>
        )}
      </div>
    );
  }

  const content = (
    <div className="flex flex-wrap items-center gap-3 min-w-0">
      <span className="text-slate-200 font-medium">{category.name}</span>
      <span className="text-slate-500 text-sm">secção: {sectionName}</span>
      <span className="text-slate-500 text-sm">modelo: {templateName}</span>
      {imageSamples.length > 0 && (
        <span className="text-slate-500 text-sm">sample: {sampleName}</span>
      )}
      <span className="text-slate-500 text-sm">ordem {category.sort_order}</span>
    </div>
  );

  const buttons = (
    <div className="flex gap-2 shrink-0">
      <Button type="button" variant="outline" onClick={() => setEditing(true)} className="py-1 px-2 text-sm">
        Editar
      </Button>
      <form ref={deleteFormRef} action={(fd: FormData) => { void deleteCategory(null, fd); }} className="inline">
        <input type="hidden" name="id" value={category.id} />
        <Button type="button" variant="danger" onClick={handleDeleteClick} className="py-1 px-2 text-sm">
          Apagar
        </Button>
      </form>
    </div>
  );

  if (contentOnly && !editing) {
    return (
      <div className="flex justify-between items-start gap-3 w-full">
        {content}
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start gap-3 w-full">
      {content}
      {buttons}
    </div>
  );
}
