"use client";

import { useState } from "react";
import { Button } from "@/components/admin";

type UserManageActionsProps = {
  userId: string;
  deletedAt: string | null;
  onSuccess: () => void;
};

export function UserManageActions({ userId, deletedAt, onSuccess }: UserManageActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isAnulado = !!deletedAt;

  const base = `/api/portal-admin/users/${userId}`;

  async function doRequest(
    action: string,
    opts: { method?: string; body?: object } = {}
  ): Promise<boolean> {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`${base}/${action}`, {
        method: opts.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? res.statusText);
        return false;
      }
      onSuccess();
      return true;
    } finally {
      setLoading(null);
    }
  }

  async function handleAlterarPassword() {
    if (!newPassword.trim() || newPassword.length < 6) {
      setError("Password deve ter pelo menos 6 caracteres.");
      return;
    }
    const ok = await doRequest("alterar-password", { body: { password: newPassword } });
    if (ok) {
      setShowPasswordModal(false);
      setNewPassword("");
      setError(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
        variant="outline"
        type="button"
        disabled={!!loading}
        onClick={() => {
          setError(null);
          setNewPassword("");
          setShowPasswordModal(true);
        }}
      >
        Alterar password
      </Button>
      {!isAnulado ? (
        <Button
          variant="danger"
          type="button"
          disabled={!!loading}
          onClick={async () => {
            if (!confirm("Anular este utilizador? (Não apaga o registo; pode recuperar depois.)")) return;
            await doRequest("anular");
          }}
        >
          {loading === "anular" ? "A anular…" : "Apagar"}
        </Button>
      ) : (
        <Button
          variant="success"
          type="button"
          disabled={!!loading}
          onClick={async () => {
            if (!confirm("Recuperar este utilizador?")) return;
            await doRequest("recuperar");
          }}
        >
          {loading === "recuperar" ? "A recuperar…" : "Recuperar"}
        </Button>
      )}
      <Button
        variant="outline"
        type="button"
        disabled={!!loading}
        onClick={async () => {
          if (!confirm("Repor palavra-passe para o valor inicial e enviar email?")) return;
          await doRequest("reset-password");
        }}
      >
        {loading === "reset-password" ? "A repor…" : "Reset password"}
      </Button>
      </div>
      {error && !showPasswordModal && <p className="mt-1 text-sm text-red-400">{error}</p>}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-slate-800 p-4 shadow-xl">
            <h3 className="text-lg font-medium text-slate-200 mb-2">Alterar password</h3>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova password (mín. 6 caracteres)"
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                disabled={loading === "alterar-password"}
                onClick={handleAlterarPassword}
              >
                {loading === "alterar-password" ? "A guardar…" : "Guardar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword("");
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
