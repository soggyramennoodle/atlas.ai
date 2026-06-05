"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AiGlow } from "@/components/ui/ai-glow";

/**
 * The lecture summary (§ summary §). The text itself is read-only — students no
 * longer hand-edit it. Instead, a single "Regenerate summary" capsule re-derives
 * a fresh 4–6 sentence overview from the full notes/transcript on the server.
 *
 * While regenerating, the card lifts into its "active" AI glow, a soft pulsing
 * border breathes around it, and the new summary streams in token by token
 * (ChatGPT-style) with a blinking caret — never popping in all at once.
 */
export function SummaryCard({
  noteId,
  summary,
  onRegenerated,
}: {
  noteId: string;
  summary: string;
  /** Called with the final summary once a regeneration completes (to persist). */
  onRegenerated?: (summary: string) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [streamed, setStreamed] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const regenerate = useCallback(async () => {
    if (regenerating) return;
    setRegenerating(true);
    setStreamed("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/notes/${noteId}/summary`, {
        method: "POST",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res
          .json()
          .then((d) => d.error)
          .catch(() => null);
        throw new Error(msg || "Couldn't regenerate the summary.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamed(full);
      }
      // Flush any bytes the streaming decoder was still buffering.
      const tail = decoder.decode();
      if (tail) {
        full += tail;
        setStreamed(full);
      }

      const final = full.trim();
      if (!final) throw new Error("Atlas returned an empty summary.");
      onRegenerated?.(final);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(
          err instanceof Error ? err.message : "Couldn't regenerate the summary."
        );
        setStreamed("");
      }
    } finally {
      setRegenerating(false);
      abortRef.current = null;
    }
  }, [noteId, regenerating, onRegenerated]);

  const shown = regenerating ? streamed : summary;

  return (
    <motion.section
      className={cn(
        "ai-ring relative isolate overflow-hidden rounded-[6px] border border-border bg-card p-6 sm:p-7"
      )}
      animate={
        regenerating
          ? {
              borderColor: [
                "rgba(108,99,255,0.25)",
                "rgba(108,99,255,0.75)",
                "rgba(108,99,255,0.25)",
              ],
              boxShadow: [
                "0 0 0px 0px rgba(108,99,255,0.0)",
                "0 0 38px 2px rgba(108,99,255,0.45)",
                "0 0 0px 0px rgba(108,99,255,0.0)",
              ],
            }
          : { borderColor: "var(--border)", boxShadow: "0 0 0px 0px rgba(108,99,255,0)" }
      }
      transition={
        regenerating
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.5 }
      }
    >
      <AiGlow
        mode={regenerating ? "active" : "idle"}
        blur={56}
        className={regenerating ? "opacity-90" : "opacity-50"}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" />
            Summary
          </h2>

          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className={cn(
              "hover-glow icon-animate inline-flex items-center gap-1.5 rounded-[4px] border border-primary/30 bg-primary/10 px-3.5 py-1.5",
              "text-xs font-medium text-primary transition-colors",
              "hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-70",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
          >
            {regenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {regenerating ? "Regenerating…" : "Regenerate summary"}
          </button>
        </div>

        <p className="mt-3 text-pretty leading-relaxed text-foreground/90">
          {shown}
          {regenerating && <StreamingCaret />}
        </p>
      </div>
    </motion.section>
  );
}

/** Blinking caret shown while the summary streams in. */
function StreamingCaret() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-full bg-primary align-baseline"
    />
  );
}
