"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Mic, Pause, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type CaptureStage } from "@/lib/upload-lecture";
import { useRecording } from "@/components/recording/recording-context";

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

        {/* Immersive aura + floating transcript (recording/paused only). One
            borderless field — the living glow itself signals that Atlas is
            listening, with the words floating inside it (§2). */}
        <AnimatePresence>
          {live && (
            <motion.div
              key="ambient"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-[24rem] overflow-hidden lg:min-h-full"
            >
              <Aura paused={phase === "paused"} />
              <FluidTranscript />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ProcessingOverlay stage={stage} />
    </div>
  );
}

/**
 * Apple-Intelligence-style fluid aura (§2): soft, organic color blobs in deep
 * purples, blues and warm ambers that drift and morph on long, mismatched loops
 * so the motion never visibly repeats. Dims and slows while paused.
 */
function Aura({ paused }: { paused: boolean }) {
  const blobs = [
    {
      color: "oklch(0.62 0.19 300 / 0.55)", // violet
      size: "60%",
      pos: { top: "8%", left: "12%" },
      anim: { x: ["0%", "26%", "-10%", "0%"], y: ["0%", "18%", "30%", "0%"], scale: [1, 1.25, 0.95, 1] },
      duration: 17,
    },
    {
      color: "oklch(0.66 0.16 250 / 0.5)", // soft blue
      size: "55%",
      pos: { top: "30%", left: "40%" },
      anim: { x: ["0%", "-24%", "16%", "0%"], y: ["0%", "-16%", "14%", "0%"], scale: [1, 0.9, 1.3, 1] },
      duration: 21,
    },
    {
      color: "oklch(0.8 0.13 70 / 0.45)", // warm amber
      size: "50%",
      pos: { top: "44%", left: "8%" },
      anim: { x: ["0%", "30%", "8%", "0%"], y: ["0%", "-22%", "-8%", "0%"], scale: [1, 1.2, 0.92, 1] },
      duration: 19,
    },
    {
      color: "oklch(0.7 0.15 330 / 0.4)", // magenta
      size: "48%",
      pos: { top: "18%", left: "48%" },
      anim: { x: ["0%", "-18%", "-30%", "0%"], y: ["0%", "24%", "6%", "0%"], scale: [1, 1.15, 1.3, 1] },
      duration: 23,
    },
  ];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-1000",
        paused ? "opacity-40" : "opacity-100"
      )}
    >
      {blobs.map((b, i) => (
        <motion.span
          key={i}
          className="absolute aspect-square rounded-full blur-[60px] mix-blend-screen"
          style={{ width: b.size, ...b.pos, background: b.color }}
          animate={b.anim}
          transition={{
            duration: paused ? b.duration * 1.8 : b.duration,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.4, 0.7, 1],
          }}
        />
      ))}
      {/* Soft central bloom that breathes. */}
      <motion.span
        className="absolute left-1/2 top-1/2 size-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.85_0.08_280/0.35),transparent)] blur-2xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: paused ? 7 : 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/**
 * Live transcript that floats inside the aura (§2). The transcript is chunked
 * into short lines on stable boundaries; only the last few are shown. New text
 * appears at the bottom while older lines drift upward and fade out.
 */
function FluidTranscript() {
  const { liveTranscript, transcriptSupported, phase } = useRecording();

  const lines = useMemo(() => {
    const words = liveTranscript.split(/\s+/).filter(Boolean);
    const out: { key: number; text: string }[] = [];
    const PER_LINE = 8;
    for (let i = 0; i < words.length; i += PER_LINE) {
      out.push({ key: i, text: words.slice(i, i + PER_LINE).join(" ") });
    }
    return out.slice(-4);
  }, [liveTranscript]);

  let placeholder: string | null = null;
  if (!transcriptSupported) {
    placeholder =
      "Live transcript isn't available in this browser — your full transcript is still generated from the audio.";
  } else if (lines.length === 0) {
    placeholder =
      phase === "paused" ? "Paused — resume to keep listening." : "Listening…";
  }

  return (
    <div className="absolute inset-0 grid place-items-center px-8">
      <div className="flex max-w-md flex-col items-center justify-end gap-2 text-center">
        {placeholder ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="text-pretty text-sm text-foreground/60"
          >
            {placeholder}
          </motion.p>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {lines.map((line, idx) => {
              const t = lines.length > 1 ? idx / (lines.length - 1) : 1;
              const opacity = 0.18 + 0.72 * t;
              return (
                <motion.p
                  key={line.key}
                  layout
                  initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
                  animate={{ opacity, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -18, filter: "blur(4px)" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-pretty text-lg font-medium leading-snug text-foreground"
                  style={{ scale: 0.9 + 0.1 * t }}
                >
                  {line.text}
                </motion.p>
              );
            })}
          </AnimatePresence>
        )}
      </div>
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
