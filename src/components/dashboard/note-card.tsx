"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, Clock, Loader2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

/**
 * A dashboard recording card. When the note is processing it wears the AI edge
 * glow; spend-cap holds get a breathing orange border instead. When processing
 * finishes the multicolor glow doesn't cut out abruptly — it lets the current
 * hue loop complete, then fades out cleanly.
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
      className="group hover-glow icon-animate relative flex flex-col rounded-[4px] border border-border bg-card p-5 transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-foreground/25 hover:bg-secondary/55 hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_16px_34px_-20px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 active:translate-y-0 motion-reduce:hover:translate-y-0"
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
        <span className="grid size-10 place-items-center rounded-[4px] border border-border bg-background text-foreground transition-[transform,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-foreground/25 motion-reduce:group-hover:translate-y-0">
          {failed ? (
            <AlertCircle className="size-5 text-destructive" />
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
              ? "inline-flex items-center gap-1.5 rounded-[4px] border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-destructive"
              : atCapacity
                ? "inline-flex items-center gap-1.5 rounded-[4px] border border-orange-500/35 bg-orange-500/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-orange-600 dark:text-orange-400"
                : processing
                  ? "inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-secondary px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground"
                  : "inline-flex items-center gap-1.5 rounded-[4px] border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-primary"
          }
        >
          <span className="size-1.5 rounded-full bg-current" />
          {failed ? "Failed" : atCapacity ? "At capacity" : processing ? "Processing" : "Ready"}
        </span>
      </div>
      <h3 className="mt-4 line-clamp-2 text-lg font-bold leading-snug tracking-tight">
        {note.title}
      </h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {note.content?.summary}
      </p>
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatDate(note.created_at)}</span>
        {formatDuration(note.duration_seconds) && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatDuration(note.duration_seconds)}
          </span>
        )}
        {note.subject && (
          <Badge
            variant="secondary"
            className="ml-auto font-normal transition-colors group-hover:border-foreground/20"
          >
            {note.subject}
          </Badge>
        )}
      </div>
      </div>
    </Link>
  );
}
