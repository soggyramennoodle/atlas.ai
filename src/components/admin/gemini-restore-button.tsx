"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Status {
  active: boolean;
  affectedJobs: number;
  affectedUsers: number;
  since: string | null;
}

export function GeminiRestoreButton() {
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
        `Mark Gemini processing restored? ${status.affectedJobs} job(s) will resume and ${status.affectedUsers} user(s) will be emailed.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gemini/resolve", { method: "POST" });
      const body = (await res.json()) as { requeued?: number; notified?: number };
      if (res.ok)
        window.alert(
          `Restored — ${body.requeued ?? 0} job(s) requeued, ${body.notified ?? 0} user(s) notified.`
        );
      else window.alert("Couldn't resolve the incident.");
    } finally {
      setBusy(false);
      setReloadKey((k) => k + 1);
    }
  }, [status]);

  const active = status?.active === true;

  const button = (
    <Button
      onClick={resolve}
      disabled={!active || busy}
      className={
        active
          ? "h-10 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          : "h-10 gap-2"
      }
      variant={active ? "default" : "outline"}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
      {active
        ? `Gemini at capacity — ${status?.affectedJobs ?? 0} held · Mark restored`
        : "Gemini processing — healthy"}
    </Button>
  );

  if (active) return button;

  // Healthy: disabled with an explanatory tooltip via native title attribute.
  return (
    <span className="inline-block cursor-not-allowed" title="Gemini API is processing normally.">
      {button}
    </span>
  );
}
