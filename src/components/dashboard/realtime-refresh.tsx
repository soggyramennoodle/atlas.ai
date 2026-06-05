"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the dashboard in sync with server-side note generation. When a durable
 * lecture job flips a note from "processing" to "ready"/"failed" — on a worker
 * the user never sees, possibly while they're on a different device — this
 * refreshes the route so the card updates live, no manual reload.
 *
 * Realtime is the primary signal; a slow poll is a fallback for when the
 * websocket isn't connected (and only runs while a processing note is present,
 * so an idle dashboard does no work).
 */
export function RealtimeRefresh({
  userId,
  hasProcessing,
}: {
  userId: string;
  hasProcessing: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-notes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  useEffect(() => {
    if (!hasProcessing) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [hasProcessing, router]);

  return null;
}
