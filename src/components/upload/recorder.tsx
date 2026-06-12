"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Download,
  Loader2,
  Lock,
  Mic,
  MonitorOff,
  MonitorSpeaker,
  Pause,
  Play,
  Save,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import {
  PILL_ICON,
  PILL_PRIMARY_INLINE,
  PILL_SECONDARY_INLINE,
} from "@/components/app/pills";
import { cn, type DeviceAudioSupport } from "@/lib/utils";
import {
  BARS,
  useRecording,
  type RecordingSource,
} from "@/components/recording/recording-context";
import { Waveform } from "@/components/recording/waveform";
import { AiGlow } from "@/components/ui/ai-glow";
import { ProcessingOverlay } from "@/components/upload/processing-overlay";

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatSavedAt(ms: number | null) {
  if (!ms) return "Saved on this device";
  return `Saved ${new Date(ms).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
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
    clip,
    stage,
    busy,
    processingIssue,
    processingSafeToLeave,
    failed,
    recoveredDraft,
    lastSavedAt,
    deviceCaptureSupported,
    deviceCaptureSupport,
    start,
    resumeDraft,
    pause,
    resume,
    stop,
    discard,
    generate,
    clearProcessingIssue,
    resetProcessing,
    download,
  } = useRecording();
  const reduceMotion = useReducedMotion();

  // Returning to the recorder after a previous take finished processing in the
  // background should give a clean slate — otherwise the leftover (provider-
  // level) processing scrim greets the user before they record anything.
  useEffect(() => {
    resetProcessing();
    // Run once on mount; resetProcessing is a no-op unless a stale background
    // scrim is showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = phase === "recording" || phase === "paused";

  return (
    <div className="relative">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Control box */}
        <div
          className={cn(
            "relative z-10 overflow-hidden rounded-3xl border border-black/[0.08] bg-white p-6 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] sm:p-8 motion-reduce:transition-none lg:will-change-transform",
            !live && "lg:translate-x-[calc(50%+0.625rem)]",
            phase === "paused" && "border-amber-500/50"
          )}
        >
          <div className="relative flex flex-col items-center text-center">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]",
                phase === "paused"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                  : "border-black/[0.12] bg-black/[0.03] text-[#0d0d0d]/70"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  phase === "paused"
                    ? "bg-amber-500"
                    : phase === "recording"
                      ? "bg-red-500"
                      : "bg-[#0d0d0d]/60",
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

            {/* Waveform — driven imperatively (see Waveform); the meter never
                re-renders React, so the aura stays smooth while recording. */}
            <Waveform
              count={BARS}
              containerClassName="mt-7 flex h-24 w-full items-center justify-center gap-[3px]"
              barClassName={cn(
                "h-full w-[3px] origin-center rounded-full bg-gradient-to-t transform-gpu",
                phase === "paused"
                  ? "from-amber-500/40 to-amber-500"
                  : "from-[#0d0d0d]/30 to-[#0d0d0d]"
              )}
              style={{ opacity: live ? 1 : 0.35 }}
            />

            <div className="mt-5 text-4xl font-light tabular-nums tracking-tight">
              {formatClock(seconds)}
            </div>

            {/* Controls */}
            <div className="mt-7 flex items-center justify-center gap-3">
              {phase === "idle" && (
                <SourcePicker
                  onPick={start}
                  deviceSupported={deviceCaptureSupported}
                  deviceSupport={deviceCaptureSupport}
                />
              )}

              {phase === "recording" && (
                <>
                  <button onClick={pause} className={PILL_ICON} aria-label="Pause">
                    <Pause className="size-5" />
                  </button>
                  <button
                    onClick={stop}
                    className={cn(PILL_PRIMARY_INLINE, "h-14 px-7 text-base")}
                  >
                    <Square className="size-4 fill-current" />
                    Stop
                  </button>
                </>
              )}

              {phase === "paused" && (
                <>
                  <button onClick={resume} className={PILL_ICON} aria-label="Resume">
                    <Play className="size-5" />
                  </button>
                  <button
                    onClick={stop}
                    className={cn(PILL_PRIMARY_INLINE, "h-14 px-7 text-base")}
                  >
                    <Square className="size-4 fill-current" />
                    Finish
                  </button>
                </>
              )}

              {phase === "recorded" && (
                <div className="w-full space-y-5">
                  {recoveredDraft && (
                    <div className="space-y-3 rounded-2xl border border-black/[0.1] bg-black/[0.02] p-4 text-left">
                      <div>
                        <p className="text-sm font-medium">Recovered recording</p>
                        <p className="mt-1 text-xs text-[#0d0d0d]/55">
                          {formatSavedAt(lastSavedAt)}
                        </p>
                      </div>
                      <button
                        onClick={resumeDraft}
                        disabled={busy}
                        className={cn(PILL_SECONDARY_INLINE, "h-11 w-full")}
                      >
                        <Play className="size-4" />
                        Resume recording
                      </button>
                    </div>
                  )}

                  {clip && (
                    <audio controls src={clip.url} className="w-full" preload="metadata" />
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={generate}
                      disabled={busy}
                      className={cn(PILL_PRIMARY_INLINE, "flex-1 text-base")}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {busy ? "Working…" : "Generate notes"}
                    </button>
                    <button
                      onClick={discard}
                      disabled={busy}
                      className={PILL_SECONDARY_INLINE}
                    >
                      <Trash2 className="size-4" />
                      Discard
                    </button>
                  </div>

                  {/* Escape hatch when processing fails: save the audio locally
                      so it can be re-uploaded later. */}
                  {failed && (
                    <div className="space-y-3 rounded-2xl border border-black/[0.15] bg-black/[0.03] p-4 text-left">
                      <p className="text-sm text-[#0d0d0d]/65">
                        Atlas couldn&apos;t process this recording. Download it now
                        and upload it again later, so you won&apos;t lose the audio.
                      </p>
                      <button
                        onClick={download}
                        className={cn(PILL_SECONDARY_INLINE, "h-11 w-full")}
                      >
                        <Download className="size-4" />
                        Download recording
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Atlas Enclave — private & encrypted session badge (§7). */}
            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-black/[0.1] px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[#0d0d0d]/55">
              <Lock className="size-3" />
              Secured by Atlas Enclave
            </span>
            {(live || recoveredDraft) && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-black/[0.1] px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[#0d0d0d]/55">
                <Save className="size-3" />
                {formatSavedAt(lastSavedAt)}
              </span>
            )}
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
                  blur={40}
                  density="lean"
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
        safeToLeave={processingSafeToLeave}
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
  deviceSupport,
}: {
  onPick: (source: RecordingSource) => void;
  deviceSupported: boolean;
  deviceSupport: DeviceAudioSupport;
}) {
  return (
    <div className="w-full space-y-3 text-left">
      <p className="text-center text-sm text-[#0d0d0d]/60">
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
              ? "Capture a lecture playing in another tab or app, plus your mic for questions."
              : deviceSupport === "browser"
                ? "Capture a lecture playing on your screen. Needs Chrome or Edge."
                : "Capture a lecture playing on your screen. Only available on a computer."
          }
          onClick={() => onPick("device")}
          disabled={!deviceSupported}
          badge={
            deviceSupported
              ? undefined
              : deviceSupport === "browser"
                ? "Chrome or Edge"
                : "Computer only"
          }
        />
      </div>
      <p className="px-1 text-center text-xs text-[#0d0d0d]/50">
        {deviceSupported ? (
          <>
            Virtual lectures ask you to share a browser tab and tick{" "}
            <span className="font-medium text-[#0d0d0d]/75">
              “Share tab audio.”
            </span>{" "}
            <span className="text-[#0d0d0d]/45">
              (Sharing a whole screen only carries audio on Windows.)
            </span>
          </>
        ) : deviceSupport === "browser" ? (
          <>
            Safari and Firefox can&apos;t capture a tab&apos;s audio. Open Atlas
            in <span className="font-medium text-[#0d0d0d]/75">Chrome</span> or{" "}
            <span className="font-medium text-[#0d0d0d]/75">Edge</span> to record
            a lecture playing on your screen.
          </>
        ) : (
          <>
            Virtual lectures aren&apos;t available on mobile devices. Open Atlas
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
        "group flex h-full flex-col items-start gap-2.5 rounded-2xl border border-black/[0.08] bg-white p-4 text-left transition-[border-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 motion-reduce:transition-none",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "hover:border-black/25 hover:shadow-[0_14px_36px_-26px_rgba(0,0,0,0.35)]"
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full border border-black/[0.1] transition-colors duration-200",
          disabled ? "text-[#0d0d0d]/40" : "text-[#0d0d0d]/80"
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex items-center gap-2 text-base font-medium leading-none">
        {title}
        {badge && (
          <span className="rounded-full border border-black/[0.1] bg-black/[0.03] px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.12em] text-[#0d0d0d]/55">
            {badge}
          </span>
        )}
      </span>
      <span className="text-pretty text-xs leading-relaxed text-[#0d0d0d]/55">
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
  const {
    subscribeTranscript,
    getLiveTranscript,
    transcriptSupported,
    liveTranscriptActive,
    source,
    phase,
  } = useRecording();
  const [liveTranscript, setLiveTranscript] = useState(() => getLiveTranscript());
  const reduceMotion = useReducedMotion();

  useEffect(() => subscribeTranscript(setLiveTranscript), [subscribeTranscript]);

  const lines = useMemo(() => {
    const words = liveTranscript.slice(-700).split(/\s+/).filter(Boolean);
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
      "Capturing the lecture audio. The live transcript isn't shown for virtual lectures. Atlas writes the full transcript from the recording afterward.";
  } else if (!transcriptSupported) {
    placeholder =
      "Live transcript isn't available in this browser. Your full transcript is still generated from the audio.";
  } else if (lines.length === 0) {
    placeholder =
      phase === "paused" ? "Paused. Resume to keep listening." : "Listening…";
  }

  return (
    <div className="absolute inset-0 z-10 grid place-items-center px-8">
      <div
        className="flex max-w-md flex-col items-center justify-end gap-2 text-center"
        style={{ textShadow: "0 1px 18px rgba(255,255,255,0.75)" }}
      >
        {placeholder ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="text-pretty text-sm text-[#0d0d0d]/70"
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
                  className="text-pretty text-lg font-medium leading-snug text-[#0d0d0d]"
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
