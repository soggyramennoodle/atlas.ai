"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  canShowRevocationForGrace,
  subscribeCaptureActivity,
} from "@/lib/capture-activity";
import { AccountLockedModal } from "@/components/account-locked-modal";
import type { AccessRevocation } from "@/lib/types";

const POLL_MS = 12_000;

export function AccessRevocationGuard({ userId }: { userId: string }) {
  const [revocation, setRevocation] = useState<AccessRevocation | null>(null);
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/access/revocation", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { revocation: AccessRevocation | null };
      setRevocation(json.revocation);
    } catch {
      // Fail open — middleware and login still guard new sessions.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`access-revocation-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "access_revocations",
          filter: `user_id=eq.${userId}`,
        },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (!revocation) {
      setVisible(false);
      return;
    }
    const update = () => {
      setVisible(canShowRevocationForGrace(revocation.grace));
    };
    update();
    const unsubscribe = subscribeCaptureActivity(update);
    return () => {
      unsubscribe();
    };
  }, [revocation]);

  async function handleExit() {
    await fetch("/api/access/revocation/ack", { method: "POST" });
    window.location.assign("/?logged_out=1");
  }

  if (!visible || !revocation) return null;

  return <AccountLockedModal kind={revocation.kind} onExit={handleExit} />;
}
