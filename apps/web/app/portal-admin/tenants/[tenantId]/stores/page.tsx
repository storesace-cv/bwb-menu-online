import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateStoreForm } from "./create-store-form";

type Props = { params: Promise<{ tenantId: string }> };

export default async function TenantStoresPage({ params }: Props) {
  const { tenantId } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("admin_list_stores", { p_tenant_id: tenantId });
  const list: { id: string; tenant_id: string; store_number: number; name: string | null; source_type: string; is_active?: boolean }[] =
    Array.isArray(raw) ? raw : [];

  return (
    <div>
      <p><Link href="/portal-admin/tenants">← Tenants</Link></p>
      <h1>Lojas do tenant</h1>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Adicionar loja</h2>
        <CreateStoreForm tenantId={tenantId} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Lista</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "600px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Nº</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Nome</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Source</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{s.store_number}</td>
                <td style={{ padding: "0.5rem" }}>{s.name ?? "—"}</td>
                <td style={{ padding: "0.5rem" }}>{s.source_type}</td>
                <td style={{ padding: "0.5rem" }}>
                  <Link href={`/portal-admin/tenants/${tenantId}/stores/${s.id}/domains`}>Domínios</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p style={{ color: "#666" }}>Nenhuma loja.</p>}
      </section>
    </div>
  );
}
