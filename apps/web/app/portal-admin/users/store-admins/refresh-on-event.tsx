"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshOnStoreAdminsEvent() {
  const router = useRouter();
  useEffect(() => {
    function onRefresh() {
      router.refresh();
    }
    window.addEventListener("store-admins-refresh", onRefresh);
    return () => window.removeEventListener("store-admins-refresh", onRefresh);
  }, [router]);
  return null;
}
