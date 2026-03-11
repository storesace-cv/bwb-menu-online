"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { assignRole } from "../actions";
import { useFormSubmitLoading } from "@/lib/use-form-submit-loading";
import { Select, Alert, SubmitButton } from "@/components/admin";

type UserRow = { id: string; email: string | null; bindings: unknown[] };
type Tenant = { id: string; nif: string; name: string | null };
type Store = { id: string; store_number: number; name: string | null };
type Role = { code: string; name: string };

export function AssignRoleForm({
  users,
  tenants,
  storesByTenant,
  roles,
}: {
  users: UserRow[];
  tenants: Tenant[];
  storesByTenant: Record<string, Store[]>;
  roles: Role[];
}) {
  const [state, formAction] = useFormState(assignRole, null);
  const [submitting, formBind] = useFormSubmitLoading(state);
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const stores = tenantId ? storesByTenant[tenantId] ?? [] : [];

  const onTenantChange = (tid: string) => {
    setTenantId(tid);
    setStoreId("");
  };

  return (
    <form action={formAction} className="flex flex-wrap gap-4 items-end" {...formBind}>
      <Select id="assign-user" name="user_id" label="Utilizador" required>
        <option value="">—</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.email ?? u.id}</option>
        ))}
      </Select>
      <Select id="assign-role" name="role_code" label="Role" required>
        <option value="">—</option>
        {roles.map((r) => (
          <option key={r.code} value={r.code}>{r.name}</option>
        ))}
      </Select>
      <Select
        id="assign-tenant"
        name="tenant_id"
        label="Tenant"
        value={tenantId}
        onChange={(e) => onTenantChange(e.target.value)}
      >
        <option value="">—</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>{t.name ?? t.nif}</option>
        ))}
      </Select>
      <Select
        id="assign-store"
        name="store_id"
        label="Loja"
        value={storeId}
        onChange={(e) => setStoreId(e.target.value)}
      >
        <option value="">—</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name ?? s.store_number}</option>
        ))}
      </Select>
      <SubmitButton variant="primary" submitting={submitting} loadingText="A atribuir…">Atribuir</SubmitButton>
      {state?.error && (
        <div className="w-full mt-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      )}
    </form>
  );
}
