"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/admin";

type UserManageActionsProps = {
  userId: string;
  deletedAt: string | null;
  onSuccess: () => void;
  storeId?: string;
  context?: "global" | "store_users" | "store_admins";
};

export function UserManageActions({ userId, deletedAt, onSuccess, storeId, context }: UserManageActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [perfilRoleCode, setPerfilRoleCode] = useState<"store_user" | "store_admin">("store_user");
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAnulado = !!deletedAt;
  const showAlterarPerfil = !!storeId && (context === "store_users" || context === "store_admins");

  const base = `/api/portal-admin/users/${userId}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

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

  function openAlterarPassword() {
    setMenuOpen(false);
    setError(null);
    setNewPassword("");
    setShowPasswordModal(true);
  }

  async function openApagar() {
    setMenuOpen(false);
    if (!confirm("Anular este utilizador? (Não apaga o registo; pode recuperar depois.)")) return;
    await doRequest("anular");
  }

  async function openRecuperar() {
    setMenuOpen(false);
    if (!confirm("Recuperar este utilizador?")) return;
    await doRequest("recuperar");
  }

  async function openResetPassword() {
    setMenuOpen(false);
    if (!confirm("Repor palavra-passe para o valor inicial e enviar email?")) return;
    await doRequest("reset-password");
  }

  function openReenviarEmail() {
    setMenuOpen(false);
    openResetPassword();
  }

  function openAlterarPerfil() {
    setMenuOpen(false);
    setError(null);
    setPerfilRoleCode("store_user");
    setShowPerfilModal(true);
  }

  async function handleAlterarPerfil() {
    if (!storeId) return;
    setLoading("assign-store-role");
    setError(null);
    try {
      const res = await fetch(`${base}/assign-store-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, role_code: perfilRoleCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? res.statusText);
        return;
      }
      setShowPerfilModal(false);
      onSuccess();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div ref={menuRef} className="relative inline-block">
      <Button
        variant="outline"
        type="button"
        disabled={!!loading}
        onClick={() => setMenuOpen((o) => !o)}
      >
        Gerir
      </Button>
      {menuOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-xl">
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
            onClick={openAlterarPassword}
          >
            Alterar password
          </button>
          {!isAnulado ? (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-slate-700"
              onClick={openApagar}
            >
              {loading === "anular" ? "A anular…" : "Apagar"}
            </button>
          ) : (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-emerald-300 hover:bg-slate-700"
              onClick={openRecuperar}
            >
              {loading === "recuperar" ? "A recuperar…" : "Recuperar"}
            </button>
          )}
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
            onClick={openResetPassword}
          >
            {loading === "reset-password" ? "A repor…" : "Reset password"}
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
            onClick={openReenviarEmail}
          >
            Re-enviar e-mail password inicial
          </button>
          {showAlterarPerfil && (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
              onClick={openAlterarPerfil}
            >
              Alterar perfil
            </button>
          )}
        </div>
      )}
      {error && !showPasswordModal && !showPerfilModal && <p className="mt-1 text-sm text-red-400">{error}</p>}

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

      {showPerfilModal && storeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-slate-800 p-4 shadow-xl">
            <h3 className="text-lg font-medium text-slate-200 mb-2">Alterar perfil</h3>
            <p className="text-sm text-slate-400 mb-3">Perfil deste utilizador nesta loja:</p>
            <select
              value={perfilRoleCode}
              onChange={(e) => setPerfilRoleCode(e.target.value as "store_user" | "store_admin")}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="store_user">Utilizador de Loja</option>
              <option value="store_admin">Admin de Loja</option>
            </select>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                disabled={loading === "assign-store-role"}
                onClick={handleAlterarPerfil}
              >
                {loading === "assign-store-role" ? "A aplicar…" : "Aplicar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPerfilModal(false);
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
