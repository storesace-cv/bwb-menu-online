"use client";

import { useState } from "react";
import { Button, Card, TableContainer, Alert } from "@/components/admin";

type StoreUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  store_id: string;
  store_name: string | null;
};

export function StoreUsersTable({ list }: { list: StoreUserRow[] }) {
  const [resetting, setResetting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleReset(userId: string) {
    if (!confirm("Repor palavra-passe para o valor inicial e enviar email?")) return;
    setResetting(userId);
    setMessage(null);
    const res = await fetch("/api/portal-admin/store-users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json().catch(() => ({}));
    setResetting(null);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? res.statusText });
      return;
    }
    setMessage({ type: "success", text: "Palavra-passe reposta e email enviado." });
    window.dispatchEvent(new CustomEvent("store-users-refresh"));
  }

  const byUser = new Map<string | null, StoreUserRow[]>();
  for (const row of list) {
    const key = row.email ?? row.id;
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(row);
  }
  const rows = Array.from(byUser.entries()).map(([email, rows]) => ({
    id: rows[0]!.id,
    email: rows[0]!.email,
    created_at: rows[0]!.created_at,
    stores: rows.map((r) => r.store_name ?? r.store_id).join(", "),
  }));

  return (
    <>
      {message && (
        <Alert variant={message.type} className="mb-4">
          {message.text}
        </Alert>
      )}
      <Card>
        <TableContainer>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-600">
                <th className="text-left py-2 px-3 text-slate-300">Email</th>
                <th className="text-left py-2 px-3 text-slate-300">Lojas</th>
                <th className="text-left py-2 px-3 text-slate-300">Acções</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-700">
                  <td className="py-2 px-3 text-slate-200">{u.email ?? "—"}</td>
                  <td className="py-2 px-3 text-slate-200">{u.stores}</td>
                  <td className="py-2 px-3">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={resetting === u.id}
                      onClick={() => handleReset(u.id)}
                    >
                      {resetting === u.id ? "A repor…" : "Reset password"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
        {rows.length === 0 && <p className="text-slate-500 py-4">Nenhum utilizador desta loja.</p>}
      </Card>
    </>
  );
}
