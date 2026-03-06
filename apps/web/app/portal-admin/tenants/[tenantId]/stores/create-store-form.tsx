"use client";

import { useFormState } from "react-dom";
import { createStore } from "../../../actions";
import { Input, Button, Alert } from "@/components/admin";

export function CreateStoreForm({ tenantId }: { tenantId: string }) {
  const [state, formAction] = useFormState(createStore, null);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end">
      <input type="hidden" name="tenant_id" value={tenantId} />
      <Input id="store_number" name="store_number" label="Nº loja" type="number" required min={1} />
      <Input id="store_name" name="name" label="Nome" type="text" placeholder="Nome da loja" />
      <Input id="source_type" name="source_type" label="Source" type="text" defaultValue="netbo" />
      <Button type="submit" variant="primary">Criar</Button>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
