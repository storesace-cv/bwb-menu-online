"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RedirectTo({ url }: { url: string }) {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/debug/portal-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "RedirectTo", url }),
    }).catch(() => {});
    router.replace(url);
  }, [router, url]);
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      A redirecionar...
    </div>
  );
}
