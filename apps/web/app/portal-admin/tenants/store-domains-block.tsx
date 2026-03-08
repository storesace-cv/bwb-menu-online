"use client";

import { useState } from "react";
import { SetDomainForm } from "./[tenantId]/stores/[storeId]/domains/set-domain-form";
import { DomainsTableClient } from "./domains-table-client";

type DomainRow = { id?: string; hostname: string; domain_type?: string; is_primary?: boolean };

export function StoreDomainsBlock({
  storeId,
  storeName,
  domains,
}: {
  storeId: string;
  storeName: string | null;
  domains: DomainRow[];
}) {
  const [configurePending, setConfigurePending] = useState(false);

  const handleConfigureDomain = async () => {
    setConfigurePending(true);
    try {
      const res = await fetch("/api/portal-admin/configure-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Erro ao registar pedido.");
      else alert("Pedido de reconfiguração nginx registado. O agente no servidor aplicará a alteração.");
    } catch (e) {
      alert("Erro ao chamar a API.");
    } finally {
      setConfigurePending(false);
    }
  };

  return (
    <div className="mt-4 pl-4 border-l-2 border-slate-600">
      <h4 className="text-sm font-medium text-slate-300 mb-2">Domínios — {storeName ?? "Loja"}</h4>
      <SetDomainForm storeId={storeId} />
      <div className="mt-2 overflow-x-auto">
        <DomainsTableClient rows={domains} tableClassName="text-sm" compact />
      </div>
      {domains.length > 0 && (
        <button
          type="button"
          onClick={handleConfigureDomain}
          disabled={configurePending}
          className="mt-2 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
        >
          {configurePending ? "A registar…" : "Configurar Domínio"}
        </button>
      )}
    </div>
  );
}

