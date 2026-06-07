"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Mounted on a note page only while the note is still "processing". The finished
 * note is rendered by client components that seed their state once via useState,
 * and `router.refresh()` deliberately merges a fresh server payload *without*
 * resetting client useState — so a soft refresh alone leaves the spinner up even
 * after the note is ready. So we poll the note's status directly and, the instant
 * it's no longer "processing", do a hard reload to render the finished note from
 * scratch — no manual reload, on any device.
 */
export function ProcessingWatcher({ noteId }: { noteId: string }) {
  useEffect(() => {
    const supabase = createClient();
    let done = false;

    const check = async () => {
      if (done) return;
      const { data } = await supabase
        .from("notes")
        .select("content")
        .eq("id", noteId)
        .single();
      const status = (data?.content as { status?: string } | null)?.status;
      // Anything that isn't "processing" is terminal (ready / failed / legacy
      // notes with no status) — reload to render the finished note.
      if (data && status !== "processing") {
        done = true;
        clearInterval(poll);
        window.location.reload();
      }
    };

    const poll = setInterval(() => void check(), 4_000);
    const channel = supabase
      .channel(`note-${noteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}` },
        () => void check()
      )
      .subscribe();
    void check();

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [noteId]);

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
