import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Card } from "@/components/admin";
import { CreateTenantForm } from "../tenants/create-tenant-form";

export default async function SettingsPage() {
  const headersList = await headers();
  const host = headersList.get("x-portal-host") ?? headersList.get("host") ?? "";
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    const globalLinks = [
      { href: "/portal-admin/users", label: "Utilizadores", description: "Gerir utilizadores do portal (global)." },
    ];
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Definições</h1>
        <p className="text-slate-400 mb-6">Escolha uma opção.</p>
        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mb-6">
          <Card className="p-5">
            <h2 className="text-lg font-medium text-slate-100 mb-2">Criar tenant</h2>
            <p className="text-sm text-slate-400 mb-4">Registar um novo tenant (NIF, nome e email).</p>
            <CreateTenantForm />
          </Card>
          {globalLinks.map(({ href, label, description }) => (
            <Link key={href} href={href}>
              <Card className="p-5 hover:border-emerald-500/50 transition-colors h-full block">
                <h2 className="text-lg font-medium text-slate-100 mb-1">{label}</h2>
                <p className="text-sm text-slate-400">{description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const links = [
    { href: "/portal-admin/settings/sections", label: "Secções", description: "Gerir secções do menu (ex.: Restaurante, Snack-Bar)." },
    { href: "/portal-admin/settings/categories", label: "Categorias", description: "Gerir categorias do menu (ex.: Entradas, Sobremesas)." },
    { href: "/portal-admin/settings/items", label: "Gestão de Artigos", description: "Criar, editar e apagar artigos do menu." },
    { href: "/portal-admin/settings/image-import", label: "Importação de Imagens", description: "Importar imagens em lote associadas aos artigos pelo código no nome do ficheiro." },
    { href: "/portal-admin/article-types", label: "Tipos de artigo", description: "Ícones e tipos de artigo (peixe, carne, marisco, etc.)." },
    { href: "/portal-admin/settings/app", label: "Parâmetros App", description: "Tema, branding, template e integração NET-BO." },
    { href: "/portal-admin/settings/ai", label: "ChatGPT / Grok", description: "Configurar IA para gerar descrições (OpenAI ou xAI, BYO-KEY)." },
    { href: "/portal-admin/users", label: "Utilizadores", description: "Gerir utilizadores da loja." },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Definições</h1>
      <p className="text-slate-400 mb-6">Escolha uma opção para configurar a loja.</p>
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        {links.map(({ href, label, description }) => (
          <Link key={href} href={href}>
            <Card className="p-5 hover:border-emerald-500/50 transition-colors h-full block">
              <h2 className="text-lg font-medium text-slate-100 mb-1">{label}</h2>
              <p className="text-sm text-slate-400">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
