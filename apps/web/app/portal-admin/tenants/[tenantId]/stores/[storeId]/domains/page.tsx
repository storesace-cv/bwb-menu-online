import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { SetDomainForm } from "./set-domain-form";

type Props = { params: Promise<{ tenantId: string; storeId: string }> };

export default async function StoreDomainsPage({ params }: Props) {
  const { tenantId, storeId } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("admin_list_domains", { p_store_id: storeId });
  const list: { id: string; store_id: string; hostname: string; domain_type: string; is_primary: boolean }[] =
    Array.isArray(raw) ? raw : [];

  return (
    <div>
      <p>
        <Link href="/portal-admin/tenants">Tenants</Link>
        {" → "}
        <Link href={`/portal-admin/tenants/${tenantId}/stores`}>Lojas</Link>
        {" → Domínios"}
      </p>
      <h1>Domínios da loja</h1>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Definir domínio</h2>
        <SetDomainForm storeId={storeId} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Lista</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "600px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Hostname</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Tipo</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Primário</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{d.hostname}</td>
                <td style={{ padding: "0.5rem" }}>{d.domain_type}</td>
                <td style={{ padding: "0.5rem" }}>{d.is_primary ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p style={{ color: "#666" }}>Nenhum domínio.</p>}
      </section>
    </div>
  );
}
