"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FileAudio,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AiGlow } from "@/components/ui/ai-glow";
import { ThinkingStatus } from "@/components/upload/thinking-status";
import { cn } from "@/lib/utils";
import {
  baseMimeType,
  extForMime,
  uploadLectureAndGenerate,
  MAX_BYTES,
  type CaptureStage,
} from "@/lib/upload-lecture";

const ACCEPTED = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/x-flac",
];

const STAGE_COPY: Record<Exclude<CaptureStage, "idle">, string> = {
  uploading: "Uploading your recording…",
  analyzing: "Atlas is writing your notes…",
};

const STAGE_DETAIL: Record<Exclude<CaptureStage, "idle">, string> = {
  uploading: "Sending the audio into your private Atlas workspace.",
  analyzing: "Keep this tab open while Atlas listens for the important parts.",
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function Uploader({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<CaptureStage>("idle");

  const busy = stage !== "idle";

  const selectFile = useCallback((f: File) => {
    const okType =
      ACCEPTED.includes(f.type) || /\.(mp3|m4a|wav|aac|ogg|flac|webm)$/i.test(f.name);
    if (!okType) {
      toast.error("Please choose an audio file (MP3, M4A, WAV, AAC, OGG…).");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`That file is over ${formatBytes(MAX_BYTES)}. Try a smaller recording.`);
      return;
    }

    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setDuration(null);

    // Read duration without blocking.
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.src = url;
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setDuration(null);
  }

  async function generate() {
    if (!file) return;
    const supabase = createClient();
    const mimeType = baseMimeType(file.type || "audio/mpeg");
    const ext = file.name.split(".").pop()?.toLowerCase() || extForMime(mimeType);

    try {
      const { id, status } = await uploadLectureAndGenerate({
        supabase,
        userId,
        data: file,
        mimeType,
        ext,
        durationSeconds: duration,
        onStage: setStage,
      });
      if (status === "processing") {
        toast.message("Atlas is still processing this recording.");
      } else if (status === "failed") {
        toast.error("Atlas couldn't process this recording.");
      } else {
        toast.success("Your notes are ready!");
      }
      router.push(`/notes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
    }
  }

  return (
    <div className="space-y-5">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) selectFile(f);
          e.target.value = "";
        }}
      />

      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed bg-card px-6 py-16 text-center transition",
            dragging
              ? "border-primary bg-primary/[0.04] scale-[1.01]"
              : "hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <motion.span
            animate={{ y: dragging ? -4 : 0 }}
            className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"
          >
            <UploadCloud className="size-8" />
          </motion.span>
          <p className="mt-5 text-lg font-medium">
            Drop your lecture recording here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or <span className="text-primary">browse your files</span> · MP3,
            M4A, WAV, AAC up to {formatBytes(MAX_BYTES)}
          </p>
        </div>
      )}

      {file && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.75rem] border bg-card p-5"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileAudio className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatBytes(file.size)}
                {duration ? ` · ${formatDuration(duration)}` : ""}
              </p>
            </div>
            {!busy && (
              <button
                onClick={reset}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {previewUrl && !busy && (
            <audio
              controls
              src={previewUrl}
              className="mt-4 w-full"
              preload="metadata"
            />
          )}

          <div className="mt-5">
            <Button
              onClick={generate}
              disabled={busy}
              className="h-12 w-full text-base"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {busy ? "Working…" : "Generate notes"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Processing overlay — the living aura bleeds full-screen behind a crisp
          focal mark, matching the in-browser recorder. */}
      <ProcessingOverlay stage={stage} />
    </div>
  );
}

function ProcessingOverlay({ stage }: { stage: CaptureStage }) {
  const reduceMotion = useReducedMotion();
  const thinking = stage === "analyzing";

  return (
    <AnimatePresence>
      {stage !== "idle" && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 grid place-items-center overflow-hidden px-4"
        >
          {/* Light veil — softly dims the page without burying it. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-background/45 backdrop-blur-sm"
          />

          {/* Full-viewport fluid aura. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <AiGlow mode="active" blend blur={90} className="!opacity-100" />
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
            <div className="relative grid size-28 place-items-center">
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-full border border-primary/20"
                animate={
                  reduceMotion
                    ? undefined
                    : { scale: [0.96, 1.06, 0.96], opacity: [0.4, 0.75, 0.4] }
                }
                transition={{ duration: 3.6, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
              />
              <div className="relative z-10 grid size-16 place-items-center rounded-full bg-background/40 text-primary shadow-[0_0_60px_-18px_color-mix(in_oklch,var(--primary)_90%,transparent)] backdrop-blur-md">
                <motion.span
                  animate={reduceMotion ? undefined : { scale: [1, 1.12, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="size-7" />
                </motion.span>
              </div>
            </div>

            <p className="mt-6 font-display text-2xl font-semibold tracking-tight">
              {STAGE_COPY[stage as Exclude<CaptureStage, "idle">]}
            </p>
            {thinking ? (
              <ThinkingStatus />
            ) : (
              <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-muted-foreground">
                {STAGE_DETAIL[stage as Exclude<CaptureStage, "idle">]}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
