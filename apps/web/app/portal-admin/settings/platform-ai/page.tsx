import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { PlatformAISettingsForm, type TenantOption } from "./platform-ai-form";

function normalizeTenantRow(row: unknown): TenantOption | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  return {
    id: r.id,
    nif: typeof r.nif === "string" ? r.nif : "",
    name: r.name != null ? String(r.name) : null,
  };
}

export const dynamic = "force-dynamic";

export default async function PlatformAISettingsPage() {
  const supabase = await createClient();
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (!isSuper) {
    redirect("/portal-admin/settings");
  }

  let tenants: TenantOption[] = [];
  try {
    const { data: raw } = await supabase.rpc("admin_list_tenants");
    const rawList = Array.isArray(raw) ? raw : [];
    tenants = rawList.map(normalizeTenantRow).filter((t): t is TenantOption => t !== null);
  } catch {
    // leave tenants empty
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">ChatGPT / Grok (plataforma)</h1>
      <p className="text-slate-400 mb-6">
        Configurar IA da plataforma e escolher em quais clientes (tenants) será usada. Nos clientes seleccionados, a opção &quot;ChatGPT / Grok&quot; nas Definições fica inibida.
      </p>
      <p className="mb-6">
        <Link href="/portal-admin/settings" className="text-emerald-400 hover:text-emerald-300">
          ← Definições
        </Link>
      </p>
      <PlatformAISettingsForm tenants={tenants} />
    </div>
  );
}
