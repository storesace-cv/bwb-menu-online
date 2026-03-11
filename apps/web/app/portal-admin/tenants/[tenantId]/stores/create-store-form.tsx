"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createStore } from "../../../actions";
import { Input, Button, Alert } from "@/components/admin";

export function CreateStoreForm({
  tenantId,
  tenantNif,
  tenantSourceType = "netbo_api",
}: {
  tenantId: string;
  tenantNif: string;
  tenantSourceType?: string;
}) {
  const [state, formAction] = useFormState(createStore, null);
  const [domainOrigin, setDomainOrigin] = useState<"shared" | "private">("shared");
  const [storeNumber, setStoreNumber] = useState<string>("");

  const nif = (tenantNif ?? "").trim().toLowerCase();
  const sharedHostname = nif && storeNumber ? `${nif}${storeNumber}.menu.bwb.pt` : null;
  const sourceType = (tenantSourceType ?? "netbo_api").trim() || "netbo_api";

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end">
      <input type="hidden" name="tenant_id" value={tenantId} />
      <input type="hidden" name="domain_origin" value={domainOrigin} />
      <input type="hidden" name="source_type" value={sourceType} />
      <Input
        id="store_number"
        name="store_number"
        label="Nº loja"
        type="number"
        required
        min={1}
        onChange={(e) => setStoreNumber((e.target as HTMLInputElement).value)}
      />
      <Input id="store_name" name="name" label="Nome da Loja" type="text" placeholder="Nome da loja" />
      <div className="mb-4">
        <label htmlFor="domain_origin_sel" className="block text-sm font-medium text-slate-300 mb-1">
          Origem do Domínio
        </label>
        <select
          id="domain_origin_sel"
          value={domainOrigin}
          onChange={(e) => setDomainOrigin(e.target.value as "shared" | "private")}
          className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white"
        >
          <option value="shared">Partilhado</option>
          <option value="private">Privado</option>
        </select>
      </div>
      {domainOrigin === "shared" ? (
        <div className="mb-4">
          <span className="block text-sm font-medium text-slate-300 mb-1">Domínio</span>
          <p className="text-sm text-slate-400">
            {sharedHostname ? (
              <>Será definido como <strong className="text-slate-200">{sharedHostname}</strong></>
            ) : (
              "Preencha Nº loja para ver o domínio partilhado."
            )}
          </p>
        </div>
      ) : (
        <Input
          id="domain_hostname"
          name="domain_hostname"
          label="Domínio"
          type="text"
          placeholder="ex.: menu.restaurante.pt (opcional)"
        />
      )}
      <Button type="submit" variant="primary">Criar</Button>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
