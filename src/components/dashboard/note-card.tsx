"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, Clock, Loader2, TriangleAlert } from "lucide-react";
import type { NoteRecord } from "@/lib/types";

type NoteCardData = Pick<
  NoteRecord,
  "id" | "title" | "subject" | "duration_seconds" | "created_at" | "content"
>;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(s: number | null) {
  if (!s) return null;
  return `${Math.round(s / 60)} min`;
}

/**
 * "active"       — note is processing; the edge glow loops continuously.
 * "winding-down" — processing finished, but we're still glowing while we wait
 *                  for the current hue loop to reach its home position so the
 *                  stop never lands mid-cycle.
 * "off"          — no glow.
 */
type GlowPhase = "active" | "winding-down" | "off";

const STATUS_CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em]";

/**
 * A dashboard recording card. When the note is processing it wears the AI edge
 * glow (the brand's one color moment); spend-cap holds get a breathing orange
 * border instead. When processing finishes the multicolor glow doesn't cut out
 * abruptly — it lets the current hue loop complete, then fades out cleanly.
 */
export function NoteCard({
  note,
  status,
  held = false,
}: {
  note: NoteCardData;
  status: "processing" | "ready" | "failed";
  /** Gemini spend-cap hold — saved but paused, not actively processing. */
  held?: boolean;
}) {
  const processing = status === "processing" && !held;
  const atCapacity = held;
  const failed = status === "failed";

  const [phase, setPhase] = useState<GlowPhase>(processing ? "active" : "off");
  const [stopping, setStopping] = useState(false);
  const glowRef = useRef<HTMLSpanElement>(null);

  const [prevProcessing, setPrevProcessing] = useState(processing);
  if (processing !== prevProcessing) {
    setPrevProcessing(processing);
    if (processing) {
      setStopping(false);
      setPhase("active");
    } else {
      setPhase((prev) => (prev === "active" ? "winding-down" : prev));
    }
  }

  useEffect(() => {
    if (phase !== "winding-down") return;

    const finish = () => {
      setStopping(true);
      window.setTimeout(() => setPhase("off"), 750);
    };

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      finish();
      return;
    }

    const el = glowRef.current;
    if (!el) {
      finish();
      return;
    }

    const onIteration = (e: AnimationEvent) => {
      if (e.animationName !== "ai-ring-hue") return;
      el.removeEventListener("animationiteration", onIteration);
      window.clearTimeout(safety);
      finish();
    };
    el.addEventListener("animationiteration", onIteration);

    const safety = window.setTimeout(finish, 12_000);

    return () => {
      el.removeEventListener("animationiteration", onIteration);
      window.clearTimeout(safety);
    };
  }, [phase]);

  const glowing = phase !== "off";

  return (
    <Link
      href={`/notes/${note.id}`}
      className="group relative flex flex-col rounded-3xl border border-black/[0.08] bg-white p-5 outline-none transition-[border-color,box-shadow] duration-300 hover:border-black/20 hover:shadow-[0_18px_50px_-32px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
    >
      {atCapacity ? <span aria-hidden className="capacity-glow" /> : null}
      {glowing && (
        <span
          ref={glowRef}
          aria-hidden
          className={
            stopping ? "processing-glow processing-glow--stopping" : "processing-glow"
          }
        />
      )}
      <div className="relative z-[1] flex flex-col">
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-full border border-black/[0.1] text-[#0d0d0d]/80 transition-colors duration-200 group-hover:border-black/25">
            {failed ? (
              <AlertCircle className="size-5" />
            ) : atCapacity ? (
              <TriangleAlert className="size-5 text-orange-500" />
            ) : processing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <BookOpen className="size-5" />
            )}
          </span>
          <span
            className={
              failed
                ? `${STATUS_CHIP_BASE} bg-[#0d0d0d] text-white`
                : atCapacity
                  ? `${STATUS_CHIP_BASE} border border-orange-500/35 bg-orange-500/10 text-orange-600`
                  : processing
                    ? `${STATUS_CHIP_BASE} border border-black/[0.12] bg-black/[0.03] text-[#0d0d0d]/60`
                    : `${STATUS_CHIP_BASE} border border-black/[0.12] text-[#0d0d0d]/70`
            }
          >
            <span className="size-1.5 rounded-full bg-current" />
            {failed
              ? "Failed"
              : atCapacity
                ? "At capacity"
                : processing
                  ? "Processing"
                  : "Ready"}
          </span>
        </div>
        <h3 className="mt-4 line-clamp-2 text-lg font-medium leading-snug tracking-tight">
          {note.title}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[#0d0d0d]/55">
          {note.content?.summary}
        </p>
        <div className="mt-4 flex items-center gap-3 text-xs text-[#0d0d0d]/50">
          <span>{formatDate(note.created_at)}</span>
          {formatDuration(note.duration_seconds) && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatDuration(note.duration_seconds)}
            </span>
          )}
          {note.subject && (
            <span className="ml-auto inline-flex max-w-[45%] items-center truncate rounded-full border border-black/[0.1] px-2.5 py-0.5 text-[0.7rem] text-[#0d0d0d]/60 transition-colors group-hover:border-black/20">
              {note.subject}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
