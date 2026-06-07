"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { consumeDashboardStale } from "@/lib/dashboard-cache";

/**
 * After mutations that change the recordings list (delete, new upload), we show
 * the cached dashboard instantly then refresh in the background so the UI
 * stays snappy without going stale for long.
 */
export function DashboardStaleRefresh() {
  const router = useRouter();

  useEffect(() => {
    if (consumeDashboardStale()) router.refresh();
  }, [router]);

  return null;
}
