"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  FileAudio,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BUCKET = "lectures";
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB — raise the bucket limit to match.
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

type Stage = "idle" | "uploading" | "analyzing";

const STAGE_COPY: Record<Exclude<Stage, "idle">, string> = {
  uploading: "Uploading your recording…",
  analyzing: "Atlas is listening and writing your notes…",
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
  const [stage, setStage] = useState<Stage>("idle");

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

    try {
      setStage("uploading");
      const ext = file.name.split(".").pop()?.toLowerCase() || "audio";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const mimeType = file.type || "audio/mpeg";

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: mimeType, upsert: false });

      if (uploadError) {
        throw new Error(
          uploadError.message.includes("exceeded")
            ? "The file is larger than your storage bucket allows. Raise the bucket's file size limit in Supabase."
            : `Upload failed: ${uploadError.message}`
        );
      }

      setStage("analyzing");
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          mimeType,
          durationSeconds: duration ? Math.round(duration) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      toast.success("Your notes are ready!");
      router.push(`/notes/${data.id}`);
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

      {/* Processing overlay */}
      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-[1.75rem] border bg-card p-8 text-center shadow-2xl"
            >
              <div className="relative mx-auto grid size-20 place-items-center">
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-primary/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                  <AudioLines className="size-7" />
                </span>
              </div>
              <p className="mt-6 font-medium">{STAGE_COPY[stage]}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Longer lectures take a little longer — please keep this tab open.
              </p>
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {(["uploading", "analyzing"] as const).map((s, i) => (
                  <span
                    key={s}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      stage === s
                        ? "w-8 bg-primary"
                        : i === 0 && stage === "analyzing"
                          ? "w-4 bg-primary/40"
                          : "w-4 bg-muted"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
