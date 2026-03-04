import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateTenantForm } from "./create-tenant-form";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("admin_list_tenants");
  const list: { id: string; nif: string; name: string | null; created_at?: string }[] = Array.isArray(raw) ? raw : [];

  return (
    <div>
      <h1>Tenants</h1>
      <p>Listar e criar tenants (Global Admin).</p>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Criar tenant</h2>
        <CreateTenantForm />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Lista</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "600px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>NIF</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Nome</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{t.nif}</td>
                <td style={{ padding: "0.5rem" }}>{t.name ?? "—"}</td>
                <td style={{ padding: "0.5rem" }}>
                  <Link href={`/portal-admin/tenants/${t.id}/stores`}>Lojas</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p style={{ color: "#666" }}>Nenhum tenant.</p>}
      </section>
    </div>
  );
}
