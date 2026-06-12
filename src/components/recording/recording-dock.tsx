"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, Loader2, Mic, MonitorSpeaker, Pause, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { GLASS_INK } from "@/components/app/glass";
import { cn } from "@/lib/utils";
import { useRecording } from "./recording-context";
import { WaveRibbon } from "./wave-ribbon";

function clock(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* Small pills tuned for the dark glass dock. */
const DOCK_BTN_PRIMARY =
  "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-xs font-medium text-[#0d0d0d] outline-none transition hover:bg-white/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white/50";
const DOCK_BTN_SECONDARY =
  "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.18] bg-white/[0.06] px-4 text-xs font-medium text-white outline-none transition hover:bg-white/[0.12] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white/40";

/**
 * Persistent fly-out card that keeps a recording session controllable from any
 * route in the (app) layout (§8). Hidden on /upload, where the full recorder
 * already shows these controls. Ink liquid-glass, sibling of the sidebar rail.
 */
export function RecordingDock() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const {
    phase,
    seconds,
    busy,
    failed,
    recoveredDraft,
    sessionLabel,
    source,
    pause,
    resume,
    resumeDraft,
    stop,
    generate,
    discard,
    download,
  } = useRecording();
  const SourceIcon = source === "device" ? MonitorSpeaker : Mic;

  const onUpload = pathname === "/upload";
  const active = phase !== "idle";
  const show = active && !onUpload;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 340, damping: 30 }
          }
          className={cn(
            "fixed bottom-5 left-5 z-50 w-72 overflow-hidden rounded-3xl p-4",
            GLASS_INK,
            phase === "paused" && "border-amber-400/40"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border",
                phase === "paused"
                  ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                  : "border-white/[0.18] bg-white/[0.08] text-white"
              )}
            >
              <SourceIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {sessionLabel}
              </p>
              <p className="text-xs tabular-nums text-white/55">
                {phase === "recording"
                  ? "Recording"
                  : phase === "paused"
                    ? "Paused"
                    : phase === "recorded"
                      ? recoveredDraft
                        ? "Recovered"
                        : "Ready"
                      : ""}{" "}
                · {clock(seconds)}
              </p>
            </div>
          </div>

          {/* Compact ribbon — imperative, same engine as the full recorder. */}
          {(phase === "recording" || phase === "paused") && (
            <div className="mt-3 h-8">
              <WaveRibbon paused={phase === "paused"} tone="light" />
            </div>
          )}

          {/* Controls */}
          <div className="mt-3 flex items-center gap-2">
            {phase === "recording" && (
              <>
                <button onClick={pause} className={DOCK_BTN_SECONDARY}>
                  <Pause className="size-3.5" /> Pause
                </button>
                <button onClick={stop} className={DOCK_BTN_PRIMARY}>
                  <Square className="size-3 fill-current" /> Stop
                </button>
              </>
            )}
            {phase === "paused" && (
              <>
                <button onClick={resume} className={DOCK_BTN_SECONDARY}>
                  <Play className="size-3.5" /> Resume
                </button>
                <button onClick={stop} className={DOCK_BTN_PRIMARY}>
                  <Square className="size-3 fill-current" /> Finish
                </button>
              </>
            )}
            {phase === "recorded" && (
              <>
                <button
                  onClick={discard}
                  disabled={busy}
                  aria-label="Discard"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-white/55 outline-none transition hover:bg-white/[0.1] hover:text-white disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <button
                  onClick={generate}
                  disabled={busy}
                  className={DOCK_BTN_PRIMARY}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {busy ? "Working…" : failed ? "Try again" : "Generate notes"}
                </button>
              </>
            )}
          </div>

          {phase === "recorded" && recoveredDraft && (
            <button
              onClick={resumeDraft}
              disabled={busy}
              className={cn(DOCK_BTN_SECONDARY, "mt-2 w-full")}
            >
              <Play className="size-3.5" />
              Resume recording
            </button>
          )}

          {/* Download escape hatch after a failed run. */}
          {phase === "recorded" && failed && (
            <button
              onClick={download}
              className={cn(DOCK_BTN_SECONDARY, "mt-2 w-full")}
            >
              <Download className="size-3.5" />
              Download recording
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
