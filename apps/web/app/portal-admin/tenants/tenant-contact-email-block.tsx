"use client";

import { useState } from "react";
import { updateTenantContactEmail, resendTenantWelcomeEmail } from "../actions";
import { Button, Input, Alert } from "@/components/admin";

export function TenantContactEmailBlock({
  tenantId,
  initialEmail,
}: {
  tenantId: string;
  initialEmail: string | null;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [editing, setEditing] = useState(false);
  const [lastSavedEmail, setLastSavedEmail] = useState<string | null>(null); // após guardar, mostrar este até revalidar
  const [saveResult, setSaveResult] = useState<{ error?: string } | null>(null);
  const [resendResult, setResendResult] = useState<{ error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  const displayEmail = lastSavedEmail ?? initialEmail ?? "";

  async function handleSave() {
    setSaveResult(null);
    setSaving(true);
    const result = await updateTenantContactEmail(tenantId, email);
    setSaving(false);
    setSaveResult(result ?? null);
    if (!result?.error) {
      setLastSavedEmail(email);
      setEditing(false);
    }
  }

  async function handleResend() {
    setResendResult(null);
    setResending(true);
    const result = await resendTenantWelcomeEmail(tenantId);
    setResending(false);
    setResendResult(result ?? null);
  }

  return (
    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-300 mb-2">Email do tenant</h3>
      {editing ? (
        <div className="space-y-2">
          <Input
            id={`tenant-email-${tenantId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="email@exemplo.pt"
            className="max-w-md"
          />
          <div className="flex gap-2">
            <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setEditing(false); setSaveResult(null); setEmail(displayEmail); }}>
              Cancelar
            </Button>
          </div>
          {saveResult?.error && (
            <Alert variant="error">{saveResult.error}</Alert>
          )}
        </div>
      ) : (
        <>
          <p className="text-slate-200 text-sm">
            {displayEmail ? (
              <span>{displayEmail}</span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </p>
          <div className="flex gap-2 mt-2">
            <Button type="button" variant="outline" onClick={() => { setEmail(displayEmail); setEditing(true); }}>
              Alterar email
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resending || !displayEmail}
              title={!displayEmail ? "Defina o email do tenant primeiro" : undefined}
            >
              {resending ? "A enviar…" : "Re-enviar e-mail de boas-vindas"}
            </Button>
          </div>
          {resendResult?.error && (
            <Alert variant="error" className="mt-2">{resendResult.error}</Alert>
          )}
          {resendResult && !resendResult.error && (
            <Alert variant="success" className="mt-2">E-mail enviado.</Alert>
          )}
        </>
      )}
    </div>
  );
}
