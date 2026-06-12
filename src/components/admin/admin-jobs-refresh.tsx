"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { GeminiRestoreButton } from "@/components/admin/gemini-restore-button";
import { ADMIN_BTN } from "@/components/admin/admin-kit";

type AdminJobsRefreshContextValue = {
  refresh: () => void;
  isRefreshing: boolean;
};

const AdminJobsRefreshContext = createContext<AdminJobsRefreshContextValue | null>(null);

export function useAdminJobsRefresh(): AdminJobsRefreshContextValue {
  const ctx = useContext(AdminJobsRefreshContext);
  return ctx ?? { refresh: () => {}, isRefreshing: false };
}

export function AdminJobsRefreshProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  // Keep the table aligned with worker updates while this page is open.
  useEffect(() => {
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <AdminJobsRefreshContext.Provider value={{ refresh, isRefreshing }}>
      {children}
    </AdminJobsRefreshContext.Provider>
  );
}

export function AdminJobsToolbar() {
  const { refresh, isRefreshing } = useAdminJobsRefresh();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <GeminiRestoreButton onResolved={refresh} />
      <button
        type="button"
        onClick={refresh}
        disabled={isRefreshing}
        className={`${ADMIN_BTN} h-10`}
        title="Reload job rows from the database"
      >
        {isRefreshing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        Reload jobs
      </button>
    </div>
  );
}
