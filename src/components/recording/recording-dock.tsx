"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, Loader2, Mic, Pause, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRecording } from "./recording-context";

function clock(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Persistent fly-out card that keeps a recording session controllable from any
 * route in the (app) layout (§8). Hidden on /upload, where the full recorder
 * already shows these controls.
 */
export function RecordingDock() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { phase, seconds, levels, busy, failed, sessionLabel, pause, resume, stop, generate, discard, download } =
    useRecording();

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
            "fixed bottom-5 left-5 z-50 w-72 overflow-hidden rounded-[1.25rem] border bg-card/95 p-4 shadow-2xl backdrop-blur-xl ring-luxe",
            phase === "paused" && "border-destructive/50"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full",
                phase === "paused"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary"
              )}
            >
              <Mic className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{sessionLabel}</p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {phase === "recording"
                  ? "Recording"
                  : phase === "paused"
                    ? "Paused"
                    : phase === "recorded"
                      ? "Ready"
                      : ""}{" "}
                · {clock(seconds)}
              </p>
            </div>
          </div>

          {/* Compact waveform */}
          {(phase === "recording" || phase === "paused") && (
            <div className="mt-3 flex h-8 items-center gap-[2px]">
              {levels.slice(0, 28).map((v, i) => (
                <motion.span
                  key={i}
                  className={cn(
                    "h-full w-[3px] flex-1 origin-center rounded-full transform-gpu",
                    phase === "paused" ? "bg-destructive/50" : "bg-primary/70"
                  )}
                  animate={{ scaleY: Math.max(0.1, v) }}
                  transition={{ duration: reduceMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="mt-3 flex items-center gap-2">
            {phase === "recording" && (
              <>
                <Button size="sm" variant="outline" onClick={pause} className="flex-1 gap-1.5">
                  <Pause className="size-3.5" /> Pause
                </Button>
                <Button size="sm" onClick={stop} className="flex-1 gap-1.5">
                  <Square className="size-3 fill-current" /> Stop
                </Button>
              </>
            )}
            {phase === "paused" && (
              <>
                <Button size="sm" variant="outline" onClick={resume} className="flex-1 gap-1.5">
                  <Play className="size-3.5" /> Resume
                </Button>
                <Button size="sm" onClick={stop} className="flex-1 gap-1.5">
                  <Square className="size-3 fill-current" /> Finish
                </Button>
              </>
            )}
            {phase === "recorded" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={discard}
                  disabled={busy}
                  className="gap-1.5"
                  aria-label="Discard"
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Button size="sm" onClick={generate} disabled={busy} className="flex-1 gap-1.5">
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {busy ? "Working…" : failed ? "Try again" : "Generate notes"}
                </Button>
              </>
            )}
          </div>

          {/* Download escape hatch after a failed run. */}
          {phase === "recorded" && failed && (
            <Button
              size="sm"
              variant="outline"
              onClick={download}
              className="mt-2 w-full gap-1.5"
            >
              <Download className="size-3.5" />
              Download recording
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
