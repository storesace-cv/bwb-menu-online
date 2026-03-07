"use client";

import { useState } from "react";
import { Input, Button, Alert, Card } from "@/components/admin";

export function StoreUsersForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/portal-admin/store-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? res.statusText);
      return;
    }
    setSuccess(true);
    setEmailSent(data.email_sent !== false);
    setEmail("");
    window.dispatchEvent(new CustomEvent("store-users-refresh"));
  }

  return (
    <Card>
      <h2 className="text-lg font-medium text-slate-200 mb-4">Criar Utilizador</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div className="min-w-[200px]">
          <Input
            id="store-user-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit">Criar</Button>
      </form>
      {error && <Alert variant="error" className="mt-4">{error}</Alert>}
      {success && (
        <Alert variant={emailSent ? "success" : "error"} className="mt-4">
          {emailSent
            ? "Utilizador criado. Foi enviado um email com os dados de acesso."
            : "Utilizador criado. O email não foi enviado; use Gerir → Re-enviar e-mail password inicial."}
        </Alert>
      )}
    </Card>
  );
}
