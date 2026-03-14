import { headers } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getPortalHost } from "@/lib/portal-mode";
import { Card } from "@/components/admin";
import { CreateTenantForm } from "../tenants/create-tenant-form";

export default async function SettingsPage() {
  const headersList = await headers();
  const host = getPortalHost(headersList);
  const supabase = await createClient();
  const { data: storeId } = await supabase.rpc("get_store_id_by_hostname", { p_hostname: host });

  if (!storeId) {
    const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
    const globalLinks = [
      { href: "/portal-admin/users", label: "Utilizadores", description: "Gerir utilizadores do portal (global)." },
    ];
    if (isSuper) {
      globalLinks.push({
        href: "/portal-admin/settings/presentation-templates",
        label: "Modelos de apresentação",
        description: "Gerir modelos de apresentação de artigos no menu (copiar). Apenas superadmin.",
      });
      globalLinks.push({
        href: "/portal-admin/settings/platform-ai",
        label: "ChatGPT / Grok",
        description: "Configurar IA da plataforma e escolher em quais clientes (tenants) será usada.",
      });
      globalLinks.push({
        href: "/portal-admin/settings/image-samples",
        label: "Samples de Imagens",
        description: "Carregar imagens sample que as categorias podem usar como imagem de fallback para artigos sem foto. Apenas superadmin.",
      });
    }
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
            <a key={href} href={href} className="block">
              <Card className="p-5 hover:border-emerald-500/50 transition-colors h-full block">
                <h2 className="text-lg font-medium text-slate-100 mb-1">{label}</h2>
                <p className="text-sm text-slate-400">{description}</p>
              </Card>
            </a>
          ))}
        </div>
      </div>
    );
  }

  const { data: usesPlatformAi } = await supabase.rpc("store_uses_platform_ai", {
    p_store_id: storeId,
  });

  const links = [
    { href: "/portal-admin/settings/sections", label: "Secções", description: "Gerir secções do menu (ex.: Restaurante, Snack-Bar)." },
    { href: "/portal-admin/settings/categories", label: "Categorias", description: "Gerir categorias do menu (ex.: Entradas, Sobremesas)." },
    { href: "/portal-admin/settings/items", label: "Gestão de Artigos", description: "Criar, editar e apagar artigos do menu." },
    { href: "/portal-admin/settings/menu-updates", label: "Actualizações ao Menu", description: "Exportar e importar dados do menu em Excel para actualizar nomes, tipos, secções e categorias." },
    { href: "/portal-admin/settings/image-import", label: "Gestão de Imagens", description: "Método de leitura de imagens e importação em lote associada aos artigos pelo código no nome do ficheiro." },
    { href: "/portal-admin/article-types", label: "Tipos de artigo", description: "Ícones e tipos de artigo (peixe, carne, marisco, etc.)." },
    { href: "/portal-admin/settings/app", label: "Parâmetros App", description: "Tema, branding, template e integração NET-BO." },
    ...(usesPlatformAi
      ? [{ href: "#", label: "ChatGPT / Grok", description: "Configurado pelo gestor da aplicação.", disabled: true as const }]
      : [{ href: "/portal-admin/settings/ai", label: "ChatGPT / Grok", description: "Configurar IA para gerar descrições (OpenAI ou xAI, BYO-KEY).", disabled: false as const }]
    ),
    { href: "/portal-admin/users", label: "Utilizadores", description: "Gerir utilizadores da loja." },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Definições</h1>
      <p className="text-slate-400 mb-6">Escolha uma opção para configurar a loja.</p>
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        {links.map(({ href, label, description, disabled }) =>
          disabled ? (
            <div key={label} className="pointer-events-none opacity-70">
              <Card className="p-5 h-full block border-slate-600/50">
                <h2 className="text-lg font-medium text-slate-100 mb-1">{label}</h2>
                <p className="text-sm text-slate-400">{description}</p>
              </Card>
            </div>
) : (
              <a key={href} href={href} className="block">
                <Card className="p-5 hover:border-emerald-500/50 transition-colors h-full block">
                  <h2 className="text-lg font-medium text-slate-100 mb-1">{label}</h2>
                  <p className="text-sm text-slate-400">{description}</p>
                </Card>
              </a>
          )
        )}
      </div>
    </div>
  );
}
