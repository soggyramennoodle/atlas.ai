"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GLASS_DARK } from "@/components/app/glass";
import { MathText } from "./math-text";

/**
 * The lecture summary (§ summary §). The text itself is read-only — students no
 * longer hand-edit it. Instead, a single "Regenerate summary" capsule re-derives
 * a fresh 4–6 sentence overview from the full notes/transcript on the server.
 *
 * While regenerating, the card keeps Atlas's AI glow on the outline only and
 * streams the new summary token by token (ChatGPT-style) with a blinking caret —
 * never popping in all at once.
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
    <section
      className={cn(GLASS_DARK, "relative isolate rounded-3xl p-6 sm:p-7")}
    >
      <span
        aria-hidden
        className="processing-glow"
        style={
          {
            "--ai-ring-flow": regenerating ? "5.5s" : "11s",
          } as CSSProperties
        }
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
            <Sparkles className="size-3.5" />
            Summary
          </h2>

          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5",
              "text-xs font-medium text-white/80 transition-colors duration-200",
              "hover:bg-white/[0.16] hover:text-white disabled:cursor-not-allowed disabled:opacity-70",
              "outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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

        <p className="mt-3 text-pretty leading-relaxed text-white/85">
          <MathText text={shown} />
          {regenerating && <StreamingCaret />}
        </p>
      </div>
    </section>
  );
}

/** Blinking caret shown while the summary streams in. */
function StreamingCaret() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-full bg-white/70 align-baseline"
    />
  );
}
