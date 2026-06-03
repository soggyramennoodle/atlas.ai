"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, Pause, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  baseMimeType,
  extForMime,
  uploadLectureAndGenerate,
  MAX_BYTES,
  type CaptureStage,
} from "@/lib/upload-lecture";

const BARS = 40;

/** Pick a recording container the browser actually supports. */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type Phase = "idle" | "recording" | "paused" | "recorded";

export function Recorder({ userId }: { userId: string }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.04));
  const [clip, setClip] = useState<{ url: string; blob: Blob; mime: string } | null>(null);
  const [stage, setStage] = useState<CaptureStage>("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef<string>("");

  const busy = stage !== "idle";

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    stopMeter();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, [stopMeter]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      teardown();
      if (clip) URL.revokeObjectURL(clip.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(buf);
      // Sample a spread of frequency bins into our bar count.
      const next: number[] = [];
      const step = Math.floor(buf.length / BARS) || 1;
      for (let i = 0; i < BARS; i++) {
        const v = buf[i * step] / 255;
        next.push(Math.max(0.04, v));
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  async function startRecording() {
    if (busy) return;
    const mime = pickMimeType();
    if (typeof MediaRecorder === "undefined" || !mime) {
      toast.error("Your browser can't record audio. Try the file upload instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      toast.error(
        "Microphone access was blocked. Allow it in your browser, or upload a file instead."
      );
      return;
    }

    streamRef.current = stream;
    mimeRef.current = mime;
    chunksRef.current = [];

    // Live level meter.
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stopMeter();
      const blob = new Blob(chunksRef.current, { type: baseMimeType(mime) });
      if (blob.size > MAX_BYTES) {
        toast.error("That recording is over 100 MB. Try a shorter session.");
        setPhase("idle");
        teardown();
        return;
      }
      const url = URL.createObjectURL(blob);
      setClip({ url, blob, mime: baseMimeType(mime) });
      setPhase("recorded");
      // Release the mic but keep the captured clip.
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    mediaRecorderRef.current = rec;
    rec.start();

    setSeconds(0);
    setPhase("recording");
    runMeter();
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function pauseRecording() {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    setPhase("paused");
    stopMeter();
    setLevels(Array(BARS).fill(0.04));
    if (tickRef.current) clearInterval(tickRef.current);
  }

  function resumeRecording() {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    setPhase("recording");
    runMeter();
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    if (tickRef.current) clearInterval(tickRef.current);
    rec.stop();
  }

  function discard() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setSeconds(0);
    setLevels(Array(BARS).fill(0.04));
    setPhase("idle");
    teardown();
  }

  async function generate() {
    if (!clip) return;
    const supabase = createClient();
    try {
      const { id } = await uploadLectureAndGenerate({
        supabase,
        userId,
        data: clip.blob,
        mimeType: clip.mime,
        ext: extForMime(clip.mime),
        durationSeconds: seconds || null,
        onStage: setStage,
      });
      toast.success("Your notes are ready!");
      router.push(`/notes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
    }
  }

  const live = phase === "recording" || phase === "paused";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border bg-card p-6 ring-luxe sm:p-8">
      {/* gold glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary">
          <span
            className={cn(
              "size-1.5 rounded-full bg-primary",
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

        {/* Waveform / clock */}
        <div className="mt-7 flex h-24 w-full items-center justify-center gap-[3px]">
          {levels.map((v, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-gradient-to-t from-primary/40 to-primary"
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
            <Button
              onClick={startRecording}
              size="lg"
              className="h-14 gap-2.5 px-7 text-base"
            >
              <Mic className="size-5" />
              Start recording
            </Button>
          )}

          {phase === "recording" && (
            <>
              <Button
                onClick={pauseRecording}
                size="lg"
                variant="outline"
                className="h-12 w-12 rounded-full p-0"
                aria-label="Pause"
              >
                <Pause className="size-5" />
              </Button>
              <Button
                onClick={stopRecording}
                size="lg"
                className="h-14 gap-2.5 px-7 text-base"
              >
                <Square className="size-4 fill-current" />
                Stop
              </Button>
            </>
          )}

          {phase === "paused" && (
            <>
              <Button
                onClick={resumeRecording}
                size="lg"
                variant="outline"
                className="h-12 w-12 rounded-full p-0"
                aria-label="Resume"
              >
                <Play className="size-5" />
              </Button>
              <Button
                onClick={stopRecording}
                size="lg"
                className="h-14 gap-2.5 px-7 text-base"
              >
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
          <p className="mt-5 max-w-sm text-sm text-muted-foreground text-pretty">
            Press record at the start of class and let it run. Atlas listens the
            whole way through — then writes your notes.
          </p>
        )}
      </div>

      <ProcessingOverlay stage={stage} />
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
