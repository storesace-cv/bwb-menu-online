"use client";

import { useFormState } from "react-dom";
import { createCategory } from "../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Select, Alert, SubmitButton } from "@/components/admin";

type Section = { id: string; name: string; sort_order: number };
type PresentationTemplate = { id: string; name: string };

export function CreateCategoryForm({ storeId, sections, presentationTemplates }: { storeId: string; sections: Section[]; presentationTemplates: PresentationTemplate[] }) {
  const [state, formAction] = useFormState(createCategory, null);
  const [submitting, formBind] = useFormSubmitLoading(state);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end" {...formBind}>
      <input type="hidden" name="store_id" value={storeId} />
      <Input id="cat-name" name="name" label="Nome" type="text" required placeholder="ex: Entradas" />
      <Select id="cat-section" name="section_id" label="Secção" required>
        <option value="">— Escolha uma secção —</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </Select>
      <Select id="cat-template" name="presentation_template_id" label="Modelo de apresentação">
        <option value="">Nenhum</option>
        {presentationTemplates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>
      <Input id="cat-sort" name="sort_order" label="Ordem" type="number" defaultValue={0} />
      <SubmitButton variant="primary" submitting={submitting} loadingText="A criar…">Criar categoria</SubmitButton>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
