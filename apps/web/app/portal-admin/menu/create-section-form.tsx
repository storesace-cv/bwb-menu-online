"use client";

import { useFormState } from "react-dom";
import { createSection } from "../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Select, Alert, SubmitButton } from "@/components/admin";

type PresentationTemplate = { id: string; name: string };

export function CreateSectionForm({ storeId, presentationTemplates }: { storeId: string; presentationTemplates: PresentationTemplate[] }) {
  const [state, formAction] = useFormState(createSection, null);
  const [submitting, formBind] = useFormSubmitLoading(state);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end" {...formBind}>
      <input type="hidden" name="store_id" value={storeId} />
      <Input id="section-name" name="name" label="Nome" type="text" required placeholder="ex: Snack-Bar" />
      <Input id="section-sort" name="sort_order" label="Ordem" type="number" defaultValue={0} />
      <Select id="section-template" name="presentation_template_id" label="Modelo de apresentação">
        <option value="">Nenhum</option>
        {presentationTemplates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>
      <SubmitButton variant="primary" submitting={submitting} loadingText="A criar…">Criar secção</SubmitButton>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
