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
      <div className="mb-4">
        <label htmlFor="domain_type" className="block text-sm font-medium text-slate-300 mb-1">
          Origem do Domínio
        </label>
        <select
          id="domain_type"
          name="domain_type"
          defaultValue="default"
          className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white"
        >
          <option value="default">Partilhado</option>
          <option value="custom">Privado</option>
        </select>
      </div>
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
