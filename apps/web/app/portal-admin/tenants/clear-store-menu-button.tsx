"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { clearStoreMenu } from "../actions";
import { Alert } from "@/components/admin";

export function ClearStoreMenuButton({ storeId, storeName }: { storeId: string; storeName: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(clearStoreMenu, null);

  const handleClick = () => {
    const name = storeName?.trim() || "esta loja";
    if (
      !confirm(
        `Apagar todo o menu da loja "${name}"? Secções, categorias, artigos e tipos de artigo serão eliminados. Esta ação é irreversível.`
      )
    ) {
      return;
    }
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={formAction} className="inline">
      <input type="hidden" name="store_id" value={storeId} />
      <button
        type="button"
        onClick={handleClick}
        className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        Apagar menu da loja
      </button>
      {state?.error && (
        <div className="mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
