"use client";

import Link from "next/link";
import { useRef } from "react";
import { deleteMenuItem } from "../../actions";
import { Button } from "@/components/admin";

export function ItemActions({ itemId, menuName }: { itemId: string; menuName: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleDeleteClick = () => {
    if (!confirm(`Apagar o item «${menuName}»?`)) return;
    formRef.current?.requestSubmit();
  };

  return (
    <span className="flex gap-2 items-center">
      <Link
        href={`/portal-admin/settings/items/${itemId}/edit`}
        className="text-emerald-400 hover:text-emerald-300 text-sm"
        target="_blank"
        rel="noopener noreferrer"
      >
        Editar
      </Link>
      <form ref={formRef} action={(fd: FormData) => { void deleteMenuItem(null, fd); }} className="inline">
        <input type="hidden" name="id" value={itemId} />
        <Button type="button" variant="outline" onClick={handleDeleteClick} className="py-1 px-2 text-sm">
          Apagar
        </Button>
      </form>
    </span>
  );
}
