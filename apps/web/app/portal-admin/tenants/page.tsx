import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { CreateTenantForm } from "./create-tenant-form";
import { Card, TableContainer } from "@/components/admin";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase.rpc("admin_list_tenants");
  const list: { id: string; nif: string; name: string | null; created_at?: string }[] = Array.isArray(raw) ? raw : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Tenants</h1>
      <p className="text-slate-400 mb-6">Listar e criar tenants (Global Admin).</p>

      <section className="mb-8">
        <Card>
          <h2 className="text-lg font-medium text-slate-200 mb-4">Criar tenant</h2>
          <CreateTenantForm />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Lista</h2>
        <Card>
          <TableContainer>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-600">
                  <th className="text-left py-2 px-3 text-slate-300">NIF</th>
                  <th className="text-left py-2 px-3 text-slate-300">Nome</th>
                  <th className="text-left py-2 px-3 text-slate-300"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-b border-slate-700">
                    <td className="py-2 px-3 text-slate-200">{t.nif}</td>
                    <td className="py-2 px-3 text-slate-200">{t.name ?? "—"}</td>
                    <td className="py-2 px-3">
                      <Link href={`/portal-admin/tenants/${t.id}/stores`} className="text-emerald-400 hover:text-emerald-300">
                        Lojas
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          {list.length === 0 && <p className="text-slate-500 py-4">Nenhum tenant.</p>}
        </Card>
      </section>
    </div>
  );
}
