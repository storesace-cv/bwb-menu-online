"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Card, Input, Button, Alert } from "@/components/admin";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    const payload = { event: "LoginSuccess", url: "/portal-admin" };
    navigator.sendBeacon(
      "/api/debug/portal-log",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
    window.location.href = "/portal-admin";
  }

  return (
    <div className="max-w-md mx-auto pt-12 px-4">
      <Card>
        <h1 className="text-xl font-semibold text-slate-100 mb-6">Login — Portal Admin</h1>
        <form onSubmit={handleSubmit}>
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}
          <Button type="submit" variant="primary">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
