"use client";

import { useFormState } from "react-dom";
import { createTenant } from "../actions";
import { Input, Button, Alert } from "@/components/admin";

export function CreateTenantForm() {
  const [state, formAction] = useFormState(createTenant, null);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end">
      <Input id="nif" name="nif" label="NIF" type="text" required placeholder="123456789" />
      <Input id="tenant-name" name="name" label="Nome" type="text" placeholder="Nome do tenant" />
      <Button type="submit" variant="primary">Criar</Button>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
