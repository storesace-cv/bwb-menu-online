"use client";

import { useFormState } from "react-dom";
import { createArticleType } from "../actions";
import { MENU_ICON_CODES, MenuIcon } from "@/components/menu-icons";
import { Input, Select, Button, Alert } from "@/components/admin";

export function CreateArticleTypeForm({ storeId }: { storeId: string }) {
  const [state, formAction] = useFormState(createArticleType, null);

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end">
      <input type="hidden" name="store_id" value={storeId} />
      <Input id="at-name" name="name" label="Nome" type="text" required placeholder="ex: Carne" />
      <Select id="at-icon" name="icon_code" label="Ícone" className="min-w-[7rem]">
        {MENU_ICON_CODES.map((code) => (
          <option key={code} value={code}>{code}</option>
        ))}
      </Select>
      <Input id="at-sort" name="sort_order" label="Ordem" type="number" defaultValue={0} className="w-24" />
      <Button type="submit" variant="primary">Criar tipo</Button>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}

export function ArticleTypeIconPicker({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {MENU_ICON_CODES.map((code) => (
        <label key={code} className="flex items-center cursor-pointer text-slate-300">
          <input
            type="radio"
            name={name}
            value={code}
            defaultChecked={code === (defaultValue ?? "fish")}
            className="rounded-full border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500 mr-1"
          />
          <MenuIcon code={code} size={20} />
        </label>
      ))}
    </div>
  );
}
