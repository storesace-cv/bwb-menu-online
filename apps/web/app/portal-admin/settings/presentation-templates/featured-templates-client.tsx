"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { createFeaturedTemplateFromRestaurante1 } from "../../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Button, Alert, BwbTable, SubmitButton } from "@/components/admin";
import type { ColumnDef } from "@/lib/admin/bwbTableSort";

type Template = { id: string; name: string; component_key: string };

export function FeaturedTemplatesClient({
  templates,
  hasModeloDestaque1,
}: {
  templates: Template[];
  hasModeloDestaque1: boolean;
}) {
  const [createState, createFormAction] = useFormState(createFeaturedTemplateFromRestaurante1, null);
  const [createSubmitting, createFormBind] = useFormSubmitLoading(createState);

  const columns: ColumnDef<Template>[] = [
    {
      key: "name",
      label: "Nome",
      type: "text",
      accessor: (t) => t.name,
      render: (t) => t.name,
    },
    {
      key: "component_key",
      label: "Componente",
      type: "text",
      accessor: (t) => t.component_key,
      render: (t) => <span className="text-slate-400 text-sm">{t.component_key}</span>,
    },
    {
      key: "actions",
      label: "Ações",
      type: "text",
      sortable: false,
      headerClassName: "w-48",
      render: (t) => (
        <Link href={`/portal-admin/settings/presentation-templates/featured/${t.id}/layout`} prefetch={false}>
          <Button type="button" variant="outline" className="py-1 px-2 text-sm">
            Editar layout
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <>
      {!hasModeloDestaque1 && (
        <div className="mb-4 p-4 bg-slate-800/60 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm mb-2">
            Pode criar o modelo «Modelo Destaque 1» a partir do layout do «Modelo Restaurante 1» (mesmo canvas e zonas; no menu público o card usa imagem de fundo e overlay).
          </p>
          <form action={createFormAction} {...createFormBind}>
            <SubmitButton variant="primary" submitting={createSubmitting} loadingText="A criar…">
              Criar a partir de Modelo Restaurante 1
            </SubmitButton>
          </form>
          {createState?.error && (
            <Alert variant="error" className="mt-2">
              {createState.error}
            </Alert>
          )}
        </div>
      )}
      <BwbTable<Template>
        columns={columns}
        rows={templates}
        rowKey={(t) => t.id}
        defaultSort={[{ key: "name", direction: "asc", type: "text" }]}
      />
      {templates.length === 0 && <p className="text-slate-500 py-4">Nenhum modelo de destaques.</p>}
    </>
  );
}
