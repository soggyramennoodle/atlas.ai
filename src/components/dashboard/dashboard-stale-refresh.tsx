"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Stale-while-revalidate for the dashboard: the client router cache paints the
 * last visit instantly, then we always fetch a fresh server render in the
 * background and merge it in without blocking the UI.
 */
export function DashboardStaleRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => router.refresh());
  }, [router]);

  return null;
}
