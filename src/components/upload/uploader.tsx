"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { PILL_PRIMARY } from "@/components/app/pills";
import { ProcessingOverlay } from "@/components/upload/processing-overlay";
import { cn } from "@/lib/utils";
import {
  baseMimeType,
  extForMime,
  uploadLectureAndGenerate,
  uploadLectureChunks,
  MAX_BYTES,
  type CaptureStage,
} from "@/lib/upload-lecture";
import { setCaptureActivity } from "@/lib/capture-activity";
import {
  extractAudioChunks,
  extractAudioFromVideo,
  fileHasVideoTrack,
  isLikelyVideoFile,
  UPLOAD_SEGMENT_SECONDS,
} from "@/lib/extract-audio-from-video";

/**
 * Lectures longer than this are split into ~5-min segments and run through the
 * durable splice pipeline. Shorter ones take the simpler single-file path —
 * chunking re-encodes the whole file, which isn't worth it for a short clip.
 */
const CHUNK_ABOVE_SECONDS = 8 * 60;

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

/** Wait for browser metadata — avoids skipping chunking when duration isn't ready yet. */
function probeFileDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = isLikelyVideoFile(file)
      ? document.createElement("video")
      : new Audio();
    media.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    media.onloadedmetadata = () => {
      done(Number.isFinite(media.duration) ? media.duration : null);
    };
    media.onerror = () => done(null);
    media.src = url;
  });
}

export function Uploader({ userId }: { userId: string }) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [safeToLeave, setSafeToLeave] = useState(false);
  const [processingNoteId, setProcessingNoteId] = useState<string | null>(null);
  const [prepareHint, setPrepareHint] = useState("");
  const [issue, setIssue] = useState<import("@/components/upload/processing-overlay").ProcessingIssue | null>(null);
  /** False until we've read duration/metadata for the selected file. */
  const [fileReady, setFileReady] = useState(false);
  const [durationLoading, setDurationLoading] = useState(false);
  const [transferProgress, setTransferProgress] = useState<number | null>(null);

  const busy = stage !== "idle";

  useEffect(() => {
    setCaptureActivity({
      fileUploading: stage === "preparing" || stage === "uploading",
    });
  }, [stage]);

  // While audio is being extracted or uploaded, the work lives in this tab —
  // closing or navigating away aborts it. Warn before unload until the audio is
  // safely on the server (safeToLeave), after which processing continues there.
  useEffect(() => {
    if (!busy || safeToLeave) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, safeToLeave]);

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
    setFileReady(false);
    setDurationLoading(true);
    setTransferProgress(null);

    void fileHasVideoTrack(f).then(setHasVideo);

    void probeFileDuration(f).then((seconds) => {
      if (seconds) setDuration(seconds);
      setDurationLoading(false);
      setFileReady(true);
    });
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
    setFileReady(false);
    setDurationLoading(false);
    setTransferProgress(null);
  }

  async function generate() {
    if (!file) return;
    const supabase = createClient();
    let uploadData: Blob | File = file;
    let mimeType = audioMimeForFile(file) ?? baseMimeType(file.type || "audio/mpeg");
    let durationSeconds = duration;

    try {
      setTransferProgress(null);

      // Long lectures: split into ~5-min segments so each stays within Gemini's
      // limits and is transcribed + spliced by the same worker the live recorder
      // uses. Short ones keep the simple single-file path. On any chunking error
      // we fall back to single-file (no worse than before).
      const shouldChunk =
        (durationSeconds ?? 0) > CHUNK_ABOVE_SECONDS || file.size > 10 * 1024 * 1024;
      if (shouldChunk) {
        try {
          setStage("preparing");
          setPrepareHint("Splitting your lecture into segments…");
          setTransferProgress(0);
          const { chunks, mimeType: chunkMime } = await extractAudioChunks(file, UPLOAD_SEGMENT_SECONDS, (ratio) => {
            setTransferProgress(ratio * 0.45);
          });
          setPrepareHint("");
          setStage("uploading");
          const sessionLabel =
            file.name.replace(/\.[^.]+$/, "").trim() || "Uploaded lecture";
          const { id } = await uploadLectureChunks({
            userId,
            chunks,
            mimeType: chunkMime,
            durationSeconds,
            sessionLabel,
            onProgress: (ratio) => setTransferProgress(0.45 + ratio * 0.55),
          });
          setStage("analyzing");
          setSafeToLeave(true);
          setProcessingNoteId(id);
          return;
        } catch (chunkErr) {
          setPrepareHint("");
          console.error("Chunked upload failed:", chunkErr);
          throw chunkErr instanceof Error
            ? chunkErr
            : new Error("Could not split this lecture for processing.");
        }
      }

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

      setStage("uploading");
      setTransferProgress(null);
      const { id, status } = await uploadLectureAndGenerate({
        supabase,
        userId,
        data: uploadData,
        mimeType,
        ext: extForMime(mimeType),
        durationSeconds,
        onStage: (nextStage) => {
          setStage(nextStage);
          if (nextStage === "uploading") setTransferProgress(null);
        },
      });
      if (status === "processing") {
        // Stay on the scrim; the watcher below redirects to the note the moment
        // the worker marks it ready.
        setSafeToLeave(true);
        setProcessingNoteId(id);
        return;
      } else if (status === "failed") {
        toast.error("Atlas couldn't process this recording.");
      } else {
        toast.success("Your notes are ready!");
      }
      window.location.assign(`/notes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
      setSafeToLeave(false);
      setPrepareHint("");
    }
  }

  // Mirror of the recording pipeline's watcher: once the uploaded lecture's note
  // exists, poll its status (Realtime as a bonus) and hard-redirect to the note
  // the instant it's no longer "processing". Without this the upload scrim sat
  // forever — there was no navigation at all after a successful upload.
  useEffect(() => {
    if (!processingNoteId) return;
    const noteId = processingNoteId;
    const supabase = createClient();
    let navigated = false;

    const check = async () => {
      if (navigated) return;
      const { data } = await supabase
        .from("notes")
        .select("content")
        .eq("id", noteId)
        .single();
      const content = data?.content as { status?: string; hold?: string } | null;
      const status = content?.status;
      if (content?.hold === "gemini_spend_cap") {
        setIssue({
          kind: "capacity",
          title: "Atlas is at capacity right now",
          message:
            "Your recording is saved. Atlas AI is temporarily unable to process new recordings, and yours will finish automatically once processing is restored — you'll get an email when it's done.",
        });
        return; // stay on the overlay; do not navigate
      }
      setIssue(null);
      // Anything that isn't "processing" is terminal (ready / failed / legacy).
      if (data && status !== "processing") {
        navigated = true;
        clearInterval(poll);
        window.location.assign(`/notes/${noteId}`);
      }
    };

    const channel = supabase
      .channel(`upload-note-${noteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}` },
        () => void check()
      )
      .subscribe();
    const poll = setInterval(() => void check(), 5_000);
    void check();

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [processingNoteId]);

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
            "group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/[0.15] bg-white px-6 py-16 text-center transition-colors",
            dragging
              ? "border-[#0d0d0d] bg-black/[0.02]"
              : "hover:border-black/40 hover:bg-black/[0.015]"
          )}
        >
          <motion.span
            animate={reduceMotion ? undefined : { y: dragging ? -4 : 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="grid size-16 place-items-center rounded-full border border-black/[0.1] text-[#0d0d0d]/75"
          >
            <UploadCloud className="size-8" />
          </motion.span>
          <p className="mt-5 text-lg font-medium">
            Drop your lecture recording here
          </p>
          <p className="mt-1 text-sm text-[#0d0d0d]/55">
            or{" "}
            <span className="font-medium text-[#0d0d0d] underline-offset-2 group-hover:underline">
              browse your files
            </span>{" "}
            · MP3, MP4, M4A, WAV, AAC, OGG, WebM up to {formatBytes(MAX_BYTES)}
          </p>
        </div>
      )}

      {file && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-black/[0.08] bg-white p-5"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border border-black/[0.1] text-[#0d0d0d]/75">
              <FileAudio className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="mt-0.5 text-sm text-[#0d0d0d]/55">
                {formatBytes(file.size)}
                {durationLoading
                  ? " · reading file…"
                  : duration
                    ? ` · ${formatDuration(duration)}`
                    : ""}
                {hasVideo ? " · video (audio only will be used)" : ""}
              </p>
              {durationLoading ? (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.08]">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-[#0d0d0d]/60" />
                </div>
              ) : null}
            </div>
            {!busy && (
              <button
                onClick={reset}
                className="grid size-8 place-items-center rounded-full text-[#0d0d0d]/50 outline-none transition-colors hover:bg-black/[0.05] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
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
                className="mt-4 w-full rounded-2xl"
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
            <button
              onClick={generate}
              disabled={busy || durationLoading || !fileReady}
              className={cn(PILL_PRIMARY, "h-12 text-base")}
            >
              {busy || durationLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {busy
                ? "Working…"
                : durationLoading
                  ? "Reading file…"
                  : "Generate notes"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Shared lightweight processing overlay. */}
      <ProcessingOverlay
        stage={stage}
        issue={issue}
        safeToLeave={safeToLeave}
        subLabel={prepareHint}
        progress={transferProgress}
      />
    </div>
  );
}
