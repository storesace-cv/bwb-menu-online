"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/admin";

const BACKUP_TYPE_LABEL: Record<string, string> = {
  excel_netbo: "antes da última importação",
  excel_zsbms: "antes da última importação",
  netbo: "antes do último sync",
};

function formatBackupDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function RestoreBackupButton({
  storeId,
  createdAt,
  backupType,
}: {
  storeId: string;
  createdAt: string;
  backupType: string;
}) {
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const label = BACKUP_TYPE_LABEL[backupType] ?? backupType;

  async function handleRestore() {
    if (!confirm("Tem a certeza? Os dados actuais serão substituídos pelo estado do backup.")) return;
    setRestoring(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal-admin/sync/restore-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setMessage({ type: "success", text: "Backup restaurado. A actualizar a página…" });
        window.location.reload();
      } else {
        setMessage({ type: "error", text: data.error ?? "Erro ao restaurar" });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro de rede" });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="mt-4 p-4 rounded-lg bg-slate-800/60 border border-slate-700">
      <p className="text-slate-300 text-sm mb-2">
        Último backup: {formatBackupDate(createdAt)} ({label})
      </p>
      <Button
        onClick={handleRestore}
        disabled={restoring}
        className="px-4 py-2"
      >
        {restoring ? (
          <>
            <Spinner className="w-4 h-4 mr-2 inline" />
            A restaurar...
          </>
        ) : (
          "Restaurar backup"
        )}
      </Button>
      {message && (
        <p className={`mt-2 text-sm ${message.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
