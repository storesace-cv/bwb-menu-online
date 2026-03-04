"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: err } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/portal-admin");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: "24rem", margin: "2rem auto", padding: "1.5rem", border: "1px solid #eee" }}>
      <h1>Alterar palavra-passe</h1>
      <p>É obrigatório alterar a palavra-passe na primeira entrada.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Nova palavra-passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="confirm">Confirmar</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </div>
        {error && <p style={{ color: "crimson", marginBottom: "0.5rem" }}>{error}</p>}
        <button type="submit">Guardar</button>
      </form>
    </div>
  );
}
