"use client";

import { useFormState } from "react-dom";
import { createTenant } from "../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Input, Alert, SubmitButton } from "@/components/admin";
import { SOURCE_TYPE_OPTIONS } from "./source-type-options";

export function CreateTenantForm() {
  const [state, formAction] = useFormState(createTenant, null);
  const [submitting, formBind] = useFormSubmitLoading(state);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end" {...formBind}>
      <Input id="nif" name="nif" label="NIF" type="text" required placeholder="123456789" />
      <Input id="tenant-name" name="name" label="Nome" type="text" placeholder="Nome do tenant" />
      <Input id="tenant-contact_email" name="contact_email" label="Email" type="email" required placeholder="email@exemplo.pt" />
      <div className="mb-4">
        <label htmlFor="tenant-source_type" className="block text-sm font-medium text-slate-300 mb-1">
          Origem dos Dados
        </label>
        <select
          id="tenant-source_type"
          name="source_type"
          defaultValue="netbo_api"
          className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white min-w-[180px]"
        >
          {SOURCE_TYPE_OPTIONS.filter((o) => !o.disabled).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton variant="primary" submitting={submitting} loadingText="A criar…">Criar</SubmitButton>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
