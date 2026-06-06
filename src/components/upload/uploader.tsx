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
import {
  extractAudioFromVideo,
  fileHasVideoTrack,
  isLikelyVideoFile,
} from "@/lib/extract-audio-from-video";

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
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
];

/** Audio MIME by file extension — recovers a usable type when the browser
 *  reports a non-audio/empty type (e.g. a downloaded recording shows as
 *  "video/webm"). Returns null if the extension isn't a known audio one. */
const EXT_TO_AUDIO_MIME: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mov: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
};

const UPLOADABLE_EXT =
  /\.(mp3|m4a|mp4|mov|wav|aac|ogg|flac|webm|mkv|m4v)$/i;

function audioMimeForFile(f: File): string | null {
  const t = baseMimeType(f.type || "");
  if (t.startsWith("audio/")) return t;
  if (t.startsWith("video/")) return "audio/mp4";
  const ext = f.name.split(".").pop()?.toLowerCase();
  return (ext && EXT_TO_AUDIO_MIME[ext]) || null;
}

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
  const [hasVideo, setHasVideo] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [safeToLeave, setSafeToLeave] = useState(false);

  const busy = stage !== "idle";

  const selectFile = useCallback((f: File) => {
    const okType =
      ACCEPTED.includes(f.type) ||
      audioMimeForFile(f) !== null ||
      UPLOADABLE_EXT.test(f.name);
    if (!okType) {
      toast.error("Please choose an audio or video file (MP3, MP4, M4A, WAV…).");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`That file is over ${formatBytes(MAX_BYTES)}. Try a smaller recording.`);
      return;
    }

    const url = URL.createObjectURL(f);
    setFile(f);
    setHasVideo(isLikelyVideoFile(f));
    setPreviewUrl(url);
    setDuration(null);
    setSafeToLeave(false);

    void fileHasVideoTrack(f).then(setHasVideo);

    const media = isLikelyVideoFile(f)
      ? document.createElement("video")
      : new Audio();
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      if (Number.isFinite(media.duration)) setDuration(media.duration);
    };
    media.src = url;
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
    setHasVideo(false);
    setPreviewUrl(null);
    setDuration(null);
    setSafeToLeave(false);
  }

  async function generate() {
    if (!file) return;
    const supabase = createClient();
    let uploadData: Blob | File = file;
    let mimeType = audioMimeForFile(file) ?? baseMimeType(file.type || "audio/mpeg");
    let durationSeconds = duration;

    try {
      if (await fileHasVideoTrack(file)) {
        setStage("preparing");
        const extracted = await extractAudioFromVideo(file);
        uploadData = extracted.blob;
        mimeType = extracted.mimeType;
        if (extracted.duration > 0) {
          durationSeconds = extracted.duration;
          setDuration(extracted.duration);
        }
      }

      const { id, status } = await uploadLectureAndGenerate({
        supabase,
        userId,
        data: uploadData,
        mimeType,
        ext: extForMime(mimeType),
        durationSeconds,
        onStage: setStage,
      });
      if (status === "processing") {
        setSafeToLeave(true);
        toast.success("Atlas is generating your notes.");
        return;
      } else if (status === "failed") {
        toast.error("Atlas couldn't process this recording.");
      } else {
        toast.success("Your notes are ready!");
      }
      router.push(`/notes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
      setSafeToLeave(false);
    }
  }

  return (
    <div className="space-y-5">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4a,.mp3,.wav,.aac,.flac,.webm,.mkv"
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
            MP4, M4A, WAV, AAC, OGG, WebM up to {formatBytes(MAX_BYTES)}
          </p>
        </div>
      )}

      {file && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[4px] border border-border bg-card p-5"
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
                {hasVideo ? " · video (audio only will be used)" : ""}
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
            hasVideo ? (
              <video
                controls
                src={previewUrl}
                className="mt-4 w-full rounded-[4px]"
                preload="metadata"
              />
            ) : (
              <audio
                controls
                src={previewUrl}
                className="mt-4 w-full"
                preload="metadata"
              />
            )
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
      <ProcessingOverlay stage={stage} safeToLeave={safeToLeave} />
    </div>
  );
}
