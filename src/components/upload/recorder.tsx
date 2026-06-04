"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Download,
  Loader2,
  Lock,
  Mic,
  MonitorOff,
  MonitorSpeaker,
  Pause,
  Play,
  RefreshCcw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type CaptureStage } from "@/lib/upload-lecture";
import {
  useRecording,
  type ProcessingIssue,
  type RecordingSource,
} from "@/components/recording/recording-context";
import { AiGlow } from "@/components/ui/ai-glow";
import { ThinkingStatus } from "@/components/upload/thinking-status";

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
  const {
    phase,
    seconds,
    levels,
    clip,
    stage,
    busy,
    processingIssue,
    failed,
    deviceCaptureSupported,
    start,
    pause,
    resume,
    stop,
    discard,
    generate,
    clearProcessingIssue,
    download,
  } = useRecording();
  const reduceMotion = useReducedMotion();

  const live = phase === "recording" || phase === "paused";

  return (
    <div className="relative">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Control box */}
        <div
          className={cn(
            "glass-panel relative z-10 overflow-hidden rounded-[2rem] p-6 ring-luxe transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] sm:p-8 motion-reduce:transition-none lg:will-change-transform",
            !live && "lg:translate-x-[calc(50%+0.625rem)]",
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
                    "h-full w-[3px] origin-center rounded-full bg-gradient-to-t transform-gpu",
                    phase === "paused"
                      ? "from-destructive/40 to-destructive"
                      : "from-primary/40 to-primary"
                  )}
                  animate={{ scaleY: Math.max(0.08, v * 0.9) }}
                  transition={{ duration: reduceMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
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
                <SourcePicker
                  onPick={start}
                  deviceSupported={deviceCaptureSupported}
                />
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

                  {/* Escape hatch when processing fails: save the audio locally
                      so it can be re-uploaded later. */}
                  {failed && (
                    <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-left">
                      <p className="text-sm text-muted-foreground">
                        Atlas couldn&apos;t process this recording. Download it now
                        and upload it again later — you won&apos;t lose the audio.
                      </p>
                      <Button
                        onClick={download}
                        variant="outline"
                        size="lg"
                        className="h-11 w-full gap-2"
                      >
                        <Download className="size-4" />
                        Download recording
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Atlas Enclave — private & encrypted session badge (§7). */}
            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              <Lock className="size-3 text-primary" />
              Secured by Atlas Enclave
            </span>
          </div>
        </div>

        {/* Immersive aura + floating transcript (recording/paused only). No box,
            no border, no background — the glow bleeds freely into the page as
            if Atlas is present in the room, with the words floating inside it
            (§2/§5). The shared AI glow is used in its most dramatic mode. */}
        <AnimatePresence>
          {live && (
            <motion.div
              key="ambient"
              initial={reduceMotion ? false : { opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(3px)" }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-0 min-h-[24rem] will-change-[opacity,filter] lg:min-h-full"
            >
              {/* Bleed the glow well beyond its logical cell on every side. */}
              <div className="pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10 overflow-visible">
                <AiGlow
                  mode={phase === "paused" ? "idle" : "active"}
                  blend
                  blur={56}
                />
              </div>
              <FluidTranscript />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProcessingOverlay
        stage={stage}
        issue={processingIssue}
        onRetry={generate}
        onClear={clearProcessingIssue}
        onDiscard={discard}
        onDownload={download}
      />
    </div>
  );
}

/**
 * The pre-recording choice (§7). Two plainly-worded cards so a student
 * instantly understands the difference between recording the room and
 * capturing a lecture playing on the device.
 */
function SourcePicker({
  onPick,
  deviceSupported,
}: {
  onPick: (source: RecordingSource) => void;
  deviceSupported: boolean;
}) {
  return (
    <div className="w-full space-y-3 text-left">
      <p className="text-center text-sm text-muted-foreground">
        How are you attending this lecture?
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SourceCard
          icon={Mic}
          title="In person"
          desc="Record the room through your microphone."
          onClick={() => onPick("microphone")}
        />
        <SourceCard
          icon={deviceSupported ? MonitorSpeaker : MonitorOff}
          title="Virtual"
          desc={
            deviceSupported
              ? "Capture a lecture playing in another tab or app — plus your mic for questions."
              : "Capture a lecture playing on your screen. Only available on a computer."
          }
          onClick={() => onPick("device")}
          disabled={!deviceSupported}
          badge={deviceSupported ? undefined : "Computer only"}
        />
      </div>
      <p className="px-1 text-center text-xs text-muted-foreground/80">
        {deviceSupported ? (
          <>
            Virtual lectures ask you to share a browser tab (or your whole
            screen) and tick{" "}
            <span className="font-medium text-foreground/80">“Share audio.”</span>
          </>
        ) : (
          <>
            Virtual lectures aren&apos;t available on mobile devices — open Atlas
            on a laptop or desktop to capture a lecture playing on screen.
          </>
        )}
      </p>
    </div>
  );
}

function SourceCard({
  icon: Icon,
  title,
  desc,
  onClick,
  disabled = false,
  badge,
}: {
  icon: typeof Mic;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "group flex h-full flex-col items-start gap-2.5 rounded-2xl border border-border/70 bg-background/40 p-4 text-left transition-[transform,border-color,background-color] duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.06] active:translate-y-0 motion-reduce:hover:translate-y-0"
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl transition-colors duration-200",
          disabled
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary group-hover:bg-primary/15"
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex items-center gap-2 text-base font-medium leading-none">
        {title}
        {badge && (
          <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {badge}
          </span>
        )}
      </span>
      <span className="text-pretty text-xs leading-relaxed text-muted-foreground">
        {desc}
      </span>
    </button>
  );
}

/**
 * Live transcript that floats inside the aura (§2). The transcript is chunked
 * into short lines on stable boundaries; only the last few are shown. New text
 * appears at the bottom while older lines drift upward and fade out.
 */
function FluidTranscript() {
  const { liveTranscript, transcriptSupported, liveTranscriptActive, source, phase } =
    useRecording();
  const reduceMotion = useReducedMotion();

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
  if (source === "device" || !liveTranscriptActive) {
    placeholder =
      "Capturing the lecture audio. The live transcript isn't shown for virtual lectures — Atlas writes the full transcript from the recording afterward.";
  } else if (!transcriptSupported) {
    placeholder =
      "Live transcript isn't available in this browser — your full transcript is still generated from the audio.";
  } else if (lines.length === 0) {
    placeholder =
      phase === "paused" ? "Paused — resume to keep listening." : "Listening…";
  }

  return (
    <div className="absolute inset-0 z-10 grid place-items-center px-8">
      <div
        className="flex max-w-md flex-col items-center justify-end gap-2 text-center"
        style={{ textShadow: "0 1px 18px rgba(8,6,20,0.55)" }}
      >
        {placeholder ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="text-pretty text-sm text-foreground/70"
          >
            {placeholder}
          </motion.p>
        ) : (
          <AnimatePresence initial={false}>
            {lines.map((line, idx) => {
              const t = lines.length > 1 ? idx / (lines.length - 1) : 1;
              const opacity = 0.2 + 0.75 * t;
              return (
                <motion.p
                  key={line.key}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="text-pretty text-lg font-medium leading-snug text-foreground"
                  style={{ scale: 0.92 + 0.08 * t }}
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
  analyzing: "Atlas is writing your notes…",
};

const STAGE_DETAIL: Record<Exclude<CaptureStage, "idle">, string> = {
  uploading: "Sending the audio into your private Atlas workspace.",
  analyzing: "Keep this tab open while Atlas listens for the important parts.",
};

function ProcessingOverlay({
  stage,
  issue,
  onRetry,
  onClear,
  onDiscard,
  onDownload,
}: {
  stage: CaptureStage;
  issue: ProcessingIssue | null;
  onRetry: () => void;
  onClear: () => void;
  onDiscard: () => void;
  onDownload: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const visible = stage !== "idle" || !!issue;
  const failed = !!issue;
  const title = issue?.title ?? (stage === "idle" ? "" : STAGE_COPY[stage]);
  const detail =
    issue?.message ?? (stage === "idle" ? "" : STAGE_DETAIL[stage]);
  // Rotate the made-up status lines only while Atlas is actively thinking.
  const thinking = !failed && stage === "analyzing";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 grid place-items-center overflow-hidden px-4"
        >
          {/* Lightly veil + soften the page behind, but stop short of the frosted
              wall that used to bury everything. The glow and text above stay
              perfectly crisp. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-background/45 backdrop-blur-sm"
          />

          {/* The living aura — the shared fluid AI glow at full viewport bleed,
              free of any box so it breathes across the whole screen. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <AiGlow
              mode={failed ? "idle" : "active"}
              blend
              blur={90}
              className="!opacity-100"
            />
          </div>

          <motion.div
            initial={reduceMotion ? false : { scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", duration: 0.42, bounce: 0 }
            }
            className="relative flex w-full max-w-xl flex-col items-center text-center"
          >
            {/* A single crisp focal mark — a gently breathing halo around the
                icon, no longer a contained color wheel. */}
            <div className="relative grid size-28 place-items-center">
              <motion.div
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full border",
                  failed ? "border-destructive/25" : "border-primary/20"
                )}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        scale: [0.96, 1.06, 0.96],
                        opacity: failed ? [0.3, 0.5, 0.3] : [0.4, 0.75, 0.4],
                      }
                }
                transition={{ duration: 3.6, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
              />
              <div className="relative z-10 grid size-16 place-items-center rounded-full bg-background/40 text-primary shadow-[0_0_60px_-18px_color-mix(in_oklch,var(--primary)_90%,transparent)] backdrop-blur-md">
                {failed ? (
                  <AlertCircle className="size-7 text-destructive" />
                ) : (
                  <motion.span
                    animate={reduceMotion ? undefined : { scale: [1, 1.12, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="size-7" />
                  </motion.span>
                )}
              </div>
            </div>

            <p className="mt-6 font-display text-2xl font-semibold tracking-tight">
              {title}
            </p>
            {thinking ? (
              <ThinkingStatus />
            ) : (
              <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-muted-foreground">
                {detail}
              </p>
            )}

            {failed && (
              <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
                {issue?.kind === "silent" ? (
                  <Button onClick={onDiscard} size="lg" className="h-12 gap-2">
                    <Mic className="size-4" />
                    Record again
                  </Button>
                ) : (
                  <Button onClick={onRetry} size="lg" className="h-12 gap-2">
                    <RefreshCcw className="size-4" />
                    Try again
                  </Button>
                )}
                <Button
                  onClick={() => {
                    onDownload();
                    onClear();
                  }}
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2"
                >
                  <Download className="size-4" />
                  Download audio
                </Button>
                <Button
                  onClick={onDiscard}
                  variant="ghost"
                  size="lg"
                  className="h-12 gap-2"
                >
                  <Trash2 className="size-4" />
                  Discard
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
