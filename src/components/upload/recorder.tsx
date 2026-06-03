"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Mic, Pause, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type CaptureStage } from "@/lib/upload-lecture";
import { useRecording } from "@/components/recording/recording-context";
import { LiveTranscript } from "@/components/recording/live-transcript";

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * In-browser recorder UI (§7). All recording state lives in RecordingContext so
 * a session survives navigation; this component is the full-page presentation.
 * When recording, the controls slide to the left and an ambient AI panel +
 * live transcript fill the right half.
 */
export function Recorder() {
  const { phase, seconds, levels, clip, stage, busy, start, pause, resume, stop, discard, generate } =
    useRecording();

  const live = phase === "recording" || phase === "paused";

  return (
    <div className="relative">
      <motion.div
        layout
        className={cn(
          "grid gap-5",
          live ? "lg:grid-cols-2" : "grid-cols-1"
        )}
      >
        {/* Control box */}
        <motion.div
          layout
          className={cn(
            "relative overflow-hidden rounded-[2rem] border bg-card p-6 ring-luxe sm:p-8",
            phase === "paused" && "border-destructive/50"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl",
              phase === "paused" ? "bg-destructive/10" : "bg-primary/10"
            )}
          />

          <div className="relative flex flex-col items-center text-center">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.18em]",
                phase === "paused"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  phase === "paused" ? "bg-destructive" : "bg-primary",
                  phase === "recording" && "animate-pulse"
                )}
              />
              {phase === "recording"
                ? "Recording"
                : phase === "paused"
                  ? "Paused"
                  : phase === "recorded"
                    ? "Captured"
                    : "Record in browser"}
            </span>

            {/* Waveform */}
            <div className="mt-7 flex h-24 w-full items-center justify-center gap-[3px]">
              {levels.map((v, i) => (
                <motion.span
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full bg-gradient-to-t",
                    phase === "paused"
                      ? "from-destructive/40 to-destructive"
                      : "from-primary/40 to-primary"
                  )}
                  animate={{ height: `${Math.max(6, v * 90)}%` }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  style={{ opacity: live ? 1 : 0.35 }}
                />
              ))}
            </div>

            <div className="mt-5 font-mono text-4xl font-medium tabular-nums tracking-tight">
              {formatClock(seconds)}
            </div>

            {/* Controls */}
            <div className="mt-7 flex items-center justify-center gap-3">
              {phase === "idle" && (
                <Button onClick={start} size="lg" className="h-14 gap-2.5 px-7 text-base">
                  <Mic className="size-5" />
                  Start recording
                </Button>
              )}

              {phase === "recording" && (
                <>
                  <Button
                    onClick={pause}
                    size="lg"
                    variant="outline"
                    className="h-12 w-12 rounded-full p-0"
                    aria-label="Pause"
                  >
                    <Pause className="size-5" />
                  </Button>
                  <Button onClick={stop} size="lg" className="h-14 gap-2.5 px-7 text-base">
                    <Square className="size-4 fill-current" />
                    Stop
                  </Button>
                </>
              )}

              {phase === "paused" && (
                <>
                  <Button
                    onClick={resume}
                    size="lg"
                    variant="outline"
                    className="h-12 w-12 rounded-full p-0"
                    aria-label="Resume"
                  >
                    <Play className="size-5" />
                  </Button>
                  <Button onClick={stop} size="lg" className="h-14 gap-2.5 px-7 text-base">
                    <Square className="size-4 fill-current" />
                    Finish
                  </Button>
                </>
              )}

              {phase === "recorded" && (
                <div className="w-full space-y-5">
                  {clip && (
                    <audio controls src={clip.url} className="w-full" preload="metadata" />
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={generate}
                      disabled={busy}
                      size="lg"
                      className="h-12 flex-1 text-base"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {busy ? "Working…" : "Generate notes"}
                    </Button>
                    <Button
                      onClick={discard}
                      disabled={busy}
                      variant="outline"
                      size="lg"
                      className="h-12 gap-2"
                    >
                      <Trash2 className="size-4" />
                      Discard
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {phase === "idle" && (
              <p className="mt-5 max-w-sm text-pretty text-sm text-muted-foreground">
                Press record at the start of class and let it run. Atlas listens
                the whole way through — then writes your notes.
              </p>
            )}

            {/* Atlas Enclave — private & encrypted session badge (§7). */}
            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              <Lock className="size-3 text-primary" />
              Atlas Enclave · private &amp; encrypted
            </span>
          </div>
        </motion.div>

        {/* Ambient AI panel + live transcript (recording/paused only) */}
        <AnimatePresence>
          {live && (
            <motion.div
              key="ambient"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-5"
            >
              <div className="relative grid flex-1 place-items-center overflow-hidden rounded-[2rem] border bg-card/60 p-8">
                <AmbientOrb paused={phase === "paused"} />
                <div className="relative mt-2 text-center">
                  <p className="font-medium">
                    {phase === "paused" ? "Paused" : "Atlas is listening…"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {phase === "paused"
                      ? "Your session is held, not ended."
                      : "Capturing every word of your lecture."}
                  </p>
                </div>
              </div>
              <div className="h-48">
                <LiveTranscript />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ProcessingOverlay stage={stage} />
    </div>
  );
}

/** Pulsing circular glow — champagne while live, pulsating red while paused. */
function AmbientOrb({ paused }: { paused: boolean }) {
  return (
    <div className="relative grid size-44 place-items-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn(
            "absolute rounded-full",
            paused ? "bg-destructive/20" : "bg-primary/20"
          )}
          style={{ inset: 0 }}
          animate={{
            scale: paused ? [1, 1.12, 1] : [1, 1.35, 1],
            opacity: paused ? [0.5, 0.18, 0.5] : [0.55, 0, 0.55],
          }}
          transition={{
            duration: paused ? 1.4 : 2.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * (paused ? 0.45 : 0.85),
          }}
        />
      ))}
      <motion.span
        className={cn(
          "grid size-24 place-items-center rounded-full",
          paused ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
        )}
        animate={
          paused
            ? { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }
            : { scale: [1, 1.04, 1] }
        }
        transition={{ duration: paused ? 1.4 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Mic className="size-9" />
      </motion.span>
    </div>
  );
}

const STAGE_COPY: Record<Exclude<CaptureStage, "idle">, string> = {
  uploading: "Saving your recording…",
  analyzing: "Atlas is listening and writing your notes…",
};

function ProcessingOverlay({ stage }: { stage: CaptureStage }) {
  return (
    <AnimatePresence>
      {stage !== "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-[2rem] border bg-card p-8 text-center shadow-2xl ring-luxe"
          >
            <div className="relative mx-auto grid size-20 place-items-center">
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <Mic className="size-7" />
              </span>
            </div>
            <p className="mt-6 font-medium">{STAGE_COPY[stage]}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Longer lectures take a little longer — please keep this tab open.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
