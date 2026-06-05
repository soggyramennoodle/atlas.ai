"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Mounted on a note page only while the note is still "processing". It does two
 * things:
 *  1. Subscribes to Realtime on this note so it flips to the finished notes the
 *     instant the server-side worker is done — no manual reload, on any device.
 *  2. After 25s of waiting, reassures the user it's safe to leave — by then the
 *     job is fully server-side, so closing the tab won't lose anything. Short
 *     lectures finish before the toast ever fires.
 */
export function ProcessingWatcher({ noteId }: { noteId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`note-${noteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}` },
        () => router.refresh()
      )
      .subscribe();
    // Fallback poll in case Realtime isn't connected.
    const poll = setInterval(() => router.refresh(), 10_000);
    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [noteId, router]);

  useEffect(() => {
    const id = setTimeout(() => {
      toast.message(
        "Longer lectures take a few minutes. It's safe to close this tab — Atlas keeps working and your notes will appear in your dashboard on any device.",
        { duration: 9000 }
      );
    }, 25_000);
    return () => clearTimeout(id);
  }, []);

  return null;
}
