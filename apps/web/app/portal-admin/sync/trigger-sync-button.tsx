"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TriggerSyncButton({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync/netbo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? res.statusText });
        return;
      }
      setMessage({
        type: "ok",
        text: `Sync concluído. Run: ${data.run_id?.slice(0, 8)}… | fetched: ${data.counts?.fetched ?? "-"}, upserted: ${data.counts?.upserted ?? "-"}, errors: ${data.counts?.errors ?? "-"}`,
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? "A correr…" : "Disparar sync NET-bo"}
      </button>
      {message && (
        <span style={{ color: message.type === "err" ? "crimson" : "green" }}>
          {message.text}
        </span>
      )}
    </div>
  );
}
