"use client";

import { useFormState } from "react-dom";
import { setStoreDomain } from "../../../../../actions";
import { Input, Button, Alert } from "@/components/admin";

export function SetDomainForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useFormState(setStoreDomain, null);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end">
      <input type="hidden" name="store_id" value={storeId} />
      <Input id="hostname" name="hostname" label="Hostname" type="text" required placeholder="ex: 9999999991.menu.bwb.pt" />
      <Input id="domain_type" name="domain_type" label="Tipo" type="text" defaultValue="default" />
      <div className="flex items-center gap-2 mb-4">
        <input
          id="is_primary"
          name="is_primary"
          type="checkbox"
          value="1"
          defaultChecked
          className="rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
        />
        <label htmlFor="is_primary" className="text-sm text-slate-300">Primário</label>
      </div>
      <Button type="submit" variant="primary">Guardar</Button>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
