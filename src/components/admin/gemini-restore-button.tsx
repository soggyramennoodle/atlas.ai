"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { ADMIN_BTN } from "@/components/admin/admin-kit";

interface Status {
  active: boolean;
  affectedJobs: number;
  affectedUsers: number;
  since: string | null;
}

export function GeminiRestoreButton({ onResolved }: { onResolved?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumping this re-runs the polling effect (e.g. to refresh right after a
  // resolve) without calling setState directly from another callback.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/gemini/status", { cache: "no-store" });
        if (res.ok && !cancelled) setStatus((await res.json()) as Status);
      } catch {
        /* keep previous */
      }
    };
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [reloadKey]);

  const resolve = useCallback(async () => {
    if (!status?.active) return;
    if (
      !window.confirm(
        `Mark Gemini processing restored? ${status.affectedJobs} job(s) will resume and up to ${status.affectedUsers} back-online email(s) will be queued.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gemini/resolve", { method: "POST" });
      const body = (await res.json()) as { requeued?: number; emailsQueued?: number };
      if (res.ok) {
        onResolved?.();
        window.alert(
          `Restored — ${body.requeued ?? 0} job(s) requeued, ${body.emailsQueued ?? 0} back-online email(s) queued.`
        );
      } else {
        window.alert("Couldn't resolve the incident.");
      }
    } finally {
      setBusy(false);
      setReloadKey((k) => k + 1);
    }
  }, [status, onResolved]);

  const active = status?.active === true;

  const button = (
    <button
      type="button"
      onClick={resolve}
      disabled={!active || busy}
      className={
        active
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-xs font-medium text-white outline-none transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-black/25"
          : `${ADMIN_BTN} h-10`
      }
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
      {active
        ? `Gemini at capacity — ${status?.affectedJobs ?? 0} held · Mark restored`
        : "Gemini processing — healthy"}
    </button>
  );

  if (active) return button;

  // Healthy: disabled with an explanatory tooltip via native title attribute.
  return (
    <span className="inline-block cursor-not-allowed" title="Gemini API is processing normally.">
      {button}
    </span>
  );
}
