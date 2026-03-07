"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshOnStoreUsersEvent() {
  const router = useRouter();
  useEffect(() => {
    function onRefresh() {
      router.refresh();
    }
    window.addEventListener("store-users-refresh", onRefresh);
    return () => window.removeEventListener("store-users-refresh", onRefresh);
  }, [router]);
  return null;
}
