"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
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
import { ProcessingOverlay } from "@/components/upload/processing-overlay";
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
  const reduceMotion = useReducedMotion();
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
            "group hover-glow icon-animate flex cursor-pointer flex-col items-center justify-center rounded-[4px] border-2 border-dashed border-border bg-card px-6 py-16 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/[0.04]"
              : "hover:border-foreground/40 hover:bg-secondary"
          )}
        >
          <motion.span
            animate={reduceMotion ? undefined : { y: dragging ? -4 : 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="grid size-16 place-items-center rounded-[4px] border border-border bg-background text-foreground"
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
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="hover-glow-inside rounded-[4px] border border-border bg-card p-5"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-[4px] border border-border bg-background text-foreground">
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
                className="grid size-8 place-items-center rounded-[4px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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

      {/* Shared lightweight processing overlay. */}
      <ProcessingOverlay stage={stage} />
    </div>
  );
}
