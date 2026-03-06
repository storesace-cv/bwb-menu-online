"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Card, Input, Button, Alert } from "@/components/admin";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("Mínimo 8 caracteres.");
      return;
    }
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.auth.getSession();
    await fetch("/api/portal-admin/clear-must-change-password", { method: "POST" });
    window.location.href = "/portal-admin";
  }

  return (
    <div className="max-w-md mx-auto pt-12 px-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-100 mb-2">Alterar palavra-passe</h1>
        <p className="text-slate-400 text-sm mb-6">É obrigatório alterar a palavra-passe na primeira entrada.</p>
        <form onSubmit={handleSubmit}>
          <Input
            id="password"
            label="Nova palavra-passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            id="confirm"
            label="Confirmar"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}
          <Button type="submit" variant="primary">
            Guardar
          </Button>
        </form>
      </Card>
    </div>
  );
}
