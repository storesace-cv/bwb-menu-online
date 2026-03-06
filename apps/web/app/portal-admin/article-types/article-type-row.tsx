"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { updateArticleType, deleteArticleType } from "../actions";
import { MenuIcon, MENU_ICON_CODES } from "@/components/menu-icons";
import { Input, Select, Button, Alert } from "@/components/admin";

type ArticleType = { id: string; name: string; icon_code: string; sort_order: number };

export function ArticleTypeRow({ articleType }: { articleType: ArticleType }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateFormAction] = useFormState(updateArticleType, null);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const handleDeleteClick = () => {
    if (!confirm("Apagar este tipo de artigo? Os itens que o usam ficarão sem tipo.")) return;
    deleteFormRef.current?.requestSubmit();
  };

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-4 py-4 border-b border-slate-700 last:border-b-0">
        <form action={updateFormAction} className="flex gap-4 flex-wrap items-center">
          <input type="hidden" name="id" value={articleType.id} />
          <Input id={`edit-at-name-${articleType.id}`} name="name" label="Nome" type="text" required defaultValue={articleType.name} className="min-w-[8rem]" wrapperClassName="mb-0" />
          <Select id={`edit-at-icon-${articleType.id}`} name="icon_code" label="Ícone" defaultValue={articleType.icon_code} className="min-w-[7rem]" wrapperClassName="mb-0">
            {MENU_ICON_CODES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </Select>
          <Input id={`edit-at-sort-${articleType.id}`} name="sort_order" label="Ordem" type="number" defaultValue={articleType.sort_order} className="w-24" wrapperClassName="mb-0" />
          <Button type="submit" variant="primary">Guardar</Button>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
        </form>
        {updateState?.error && (
          <div className="w-full mt-2">
            <Alert variant="error">{updateState.error}</Alert>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-4 border-b border-slate-700 last:border-b-0">
      <MenuIcon code={articleType.icon_code} size={24} />
      <span className="text-slate-200">{articleType.name}</span>
      <span className="text-slate-500 text-sm">({articleType.icon_code})</span>
      <span className="text-slate-500 text-sm">ordem {articleType.sort_order}</span>
      <Button type="button" variant="outline" onClick={() => setEditing(true)} className="py-1 px-2 text-sm ml-2">
        Editar
      </Button>
      <form ref={deleteFormRef} action={(fd: FormData) => { void deleteArticleType(null, fd); }} className="inline">
        <input type="hidden" name="id" value={articleType.id} />
        <Button type="button" variant="danger" onClick={handleDeleteClick} className="py-1 px-2 text-sm">
          Apagar
        </Button>
      </form>
    </li>
  );
}
