"use client";

import Link from "next/link";
import { useRef } from "react";
import { deleteMenuItem } from "../actions";

export function ItemActions({ itemId, menuName }: { itemId: string; menuName: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleDeleteClick = () => {
    if (!confirm(`Apagar o item «${menuName}»?`)) return;
    formRef.current?.requestSubmit();
  };

  return (
    <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <Link href={`/portal-admin/items/${itemId}/edit`}>Editar</Link>
      <form ref={formRef} action={(fd: FormData) => { void deleteMenuItem(null, fd); }} style={{ display: "inline" }}>
        <input type="hidden" name="id" value={itemId} />
        <button type="button" onClick={handleDeleteClick}>Apagar</button>
      </form>
    </span>
  );
}
