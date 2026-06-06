"use client";

import { useEffect, useState } from "react";
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
 *
 * The small status line is a temporary diagnostic: it shows that the watcher is
 * live and what status the server is returning, so we can see exactly where the
 * processing→ready handoff is (or isn't) happening.
 */
export function ProcessingWatcher({ noteId }: { noteId: string }) {
  const [debug, setDebug] = useState("starting…");

  useEffect(() => {
    const supabase = createClient();
    let done = false;
    let polls = 0;

    const check = async () => {
      if (done) return;
      polls += 1;
      const { data, error } = await supabase
        .from("notes")
        .select("content")
        .eq("id", noteId)
        .single();
      if (error) {
        setDebug(`check #${polls}: query error — ${error.message}`);
        return;
      }
      const status = (data?.content as { status?: string } | null)?.status ?? "(none)";
      setDebug(`check #${polls}: status = ${status}`);
      // Anything that isn't "processing" is terminal (ready / failed / legacy
      // notes with no status) — reload to render the finished note.
      if (data && status !== "processing") {
        done = true;
        clearInterval(poll);
        setDebug(`status = ${status} → loading your notes…`);
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

  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card/90 px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-sm backdrop-blur">
      Atlas watcher · {debug}
    </div>
  );
}
