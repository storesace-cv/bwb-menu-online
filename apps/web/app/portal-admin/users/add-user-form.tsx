"use client";

import { useState } from "react";

type Tenant = { id: string; nif: string; name: string | null };
type Store = { id: string; store_number: number; name: string | null };
type Role = { code: string; name: string };

export function AddUserForm({
  tenants,
  storesByTenant,
  roles,
}: {
  tenants: Tenant[];
  storesByTenant: Record<string, Store[]>;
  roles: Role[];
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const stores = tenantId ? storesByTenant[tenantId] ?? [] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/portal-admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password: password.trim() || undefined,
        role_code: roleCode || undefined,
        tenant_id: tenantId || null,
        store_id: storeId || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? res.statusText);
      return;
    }
    setSuccess(true);
    setEmail("");
    setPassword("");
    setRoleCode("");
    setTenantId("");
    setStoreId("");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <label>
        Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password (opcional) <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="vazio = convite" />
      </label>
      <label>
        Role
        <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} required>
          <option value="">—</option>
          {roles.map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </label>
      <label>
        Tenant
        <select value={tenantId} onChange={(e) => { setTenantId(e.target.value); setStoreId(""); }}>
          <option value="">—</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name ?? t.nif}</option>
          ))}
        </select>
      </label>
      <label>
        Loja
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">—</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name ?? s.store_number}</option>
          ))}
        </select>
      </label>
      <button type="submit">Criar</button>
      {error && <span style={{ color: "crimson" }}>{error}</span>}
      {success && <span style={{ color: "green" }}>Utilizador criado.</span>}
    </form>
  );
}
