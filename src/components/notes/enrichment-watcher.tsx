"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Reloads the note page once background research enrichment finishes so new
 * supplementary bullets appear without a manual refresh.
 */
export function EnrichmentWatcher({ noteId }: { noteId: string }) {
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
      const enrichment = (data?.content as { enrichment?: string } | null)?.enrichment;
      if (enrichment && enrichment !== "pending") {
        done = true;
        clearInterval(poll);
        window.location.reload();
      }
    };

    const poll = setInterval(() => void check(), 5_000);
    const channel = supabase
      .channel(`note-enrich-${noteId}`)
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

  return null;
}
