"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { updateArticleType, deleteArticleType } from "../actions";
import { MenuIcon } from "@/components/menu-icons";

const ALL_ICON_CODES = ["fish", "beef", "lobster", "plant", "vehicle", "percent"];

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
      <li style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
        <form action={updateFormAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input type="hidden" name="id" value={articleType.id} />
          <label>
            Nome <input name="name" type="text" required defaultValue={articleType.name} style={{ minWidth: "8rem" }} />
          </label>
          <label>
            Ícone{" "}
            <select name="icon_code" style={{ minWidth: "7rem" }} defaultValue={articleType.icon_code}>
              {ALL_ICON_CODES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>
          <label>
            Ordem <input name="sort_order" type="number" defaultValue={articleType.sort_order} style={{ width: "4rem" }} />
          </label>
          <button type="submit">Guardar</button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </form>
        {updateState?.error && <span style={{ color: "crimson" }}>{updateState.error}</span>}
      </li>
    );
  }

  return (
    <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
      <MenuIcon code={articleType.icon_code} size={24} />
      <span>{articleType.name}</span>
      <span style={{ color: "#888", fontSize: "0.85rem" }}>({articleType.icon_code})</span>
      <span style={{ color: "#888", fontSize: "0.85rem", marginLeft: "0.25rem" }}>ordem {articleType.sort_order}</span>
      <button type="button" onClick={() => setEditing(true)} style={{ marginLeft: "0.5rem" }}>
        Editar
      </button>
      <form ref={deleteFormRef} action={(fd: FormData) => { void deleteArticleType(null, fd); }} style={{ display: "inline" }}>
        <input type="hidden" name="id" value={articleType.id} />
        <button type="button" onClick={handleDeleteClick}>Apagar</button>
      </form>
    </li>
  );
}
