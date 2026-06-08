"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogOut, X } from "lucide-react";

export function LogoutToast() {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("logged_out") != null) {
      setOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("logged_out");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [params]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), 8000);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[5.25rem] z-40 flex justify-center px-4 sm:top-[5.75rem]">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-[1200px] items-center gap-3 rounded-[4px] border border-border bg-background/95 px-4 py-3 text-sm shadow-[0_8px_30px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-border bg-secondary text-foreground">
          <LogOut className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-pretty text-foreground">
          You&apos;ve been logged out of Atlas.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-[4px] p-1 text-muted-foreground transition hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
