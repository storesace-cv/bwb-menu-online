"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("Configuração em falta. Contacte o administrador.");
      return;
    }
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      return;
    }
    try {
      await fetch("/api/debug/portal-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "LoginSuccess", url: "/portal-admin" }),
      });
    } catch {
      // ignora falhas de rede
    }
    router.push("/portal-admin");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: "24rem", margin: "2rem auto", padding: "1.5rem", border: "1px solid #eee" }}>
      <h1>Login — Portal Admin</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </div>
        {error && <p style={{ color: "crimson", marginBottom: "0.5rem" }}>{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
