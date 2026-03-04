"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { assignRole } from "../actions";

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
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const stores = tenantId ? storesByTenant[tenantId] ?? [] : [];

  const onTenantChange = (tid: string) => {
    setTenantId(tid);
    setStoreId("");
  };

  return (
    <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <label>
        Utilizador
        <select name="user_id" required>
          <option value="">—</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.email ?? u.id}</option>
          ))}
        </select>
      </label>
      <label>
        Role
        <select name="role_code" required>
          <option value="">—</option>
          {roles.map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </label>
      <label>
        Tenant
        <select name="tenant_id" value={tenantId} onChange={(e) => onTenantChange(e.target.value)}>
          <option value="">—</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name ?? t.nif}</option>
          ))}
        </select>
      </label>
      <label>
        Loja
        <select name="store_id" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">—</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name ?? s.store_number}</option>
          ))}
        </select>
      </label>
      <button type="submit">Atribuir</button>
      {state?.error && <span style={{ color: "crimson" }}>{state.error}</span>}
    </form>
  );
}
