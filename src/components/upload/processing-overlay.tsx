"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowLeft, Clock, Download, Mic, RefreshCcw, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { AiGlow } from "@/components/ui/ai-glow";
import { ThinkingStatus } from "@/components/upload/thinking-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CaptureStage } from "@/lib/upload-lecture";

const STAGE_COPY: Record<Exclude<CaptureStage, "idle">, string> = {
  preparing: "Extracting audio...",
  uploading: "Saving your recording...",
  analyzing: "Atlas is writing your notes...",
};

const STAGE_DETAIL: Record<Exclude<CaptureStage, "idle">, string> = {
  preparing:
    "Stripping the video track so only audio is sent for note generation.",
  uploading: "Sending the audio into your private Atlas workspace.",
  analyzing: "Keep this tab open while Atlas listens for the important parts.",
};

export interface ProcessingIssue {
  kind: "silent" | "timeout" | "failed" | "capacity";
  title: string;
  message: string;
}

const LONG_RUN_DELAY = 20_000;

export function ProcessingOverlay({
  stage,
  issue,
  onRetry,
  onClear,
  onDiscard,
  onDownload,
  safeToLeave,
  subLabel,
  progress,
}: {
  stage: CaptureStage;
  issue?: ProcessingIssue | null;
  onRetry?: () => void;
  onClear?: () => void;
  onDiscard?: () => void;
  onDownload?: () => void;
  safeToLeave?: boolean;
  /** Optional small line under the title (e.g. "Splitting your lecture…"). */
  subLabel?: string;
  /** 0–1 upload/prepare progress; omit for indeterminate. */
  progress?: number | null;
}) {
  const reduceMotion = useReducedMotion();
  const [showLongRunHint, setShowLongRunHint] = useState(false);
  const visible = stage !== "idle" || !!issue;
  const failed = !!issue;
  const capacity = issue?.kind === "capacity";

  useEffect(() => {
    if (stage === "idle" || failed) {
      const id = window.setTimeout(() => setShowLongRunHint(false), 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setShowLongRunHint(true), LONG_RUN_DELAY);
    return () => window.clearTimeout(id);
  }, [stage, failed]);
  const title = issue?.title ?? (stage === "idle" ? "" : STAGE_COPY[stage]);
  const detail = issue?.message ?? (stage === "idle" ? "" : STAGE_DETAIL[stage]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
          className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/92 px-4 backdrop-blur-sm"
        >
          {capacity ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/35 opacity-70 blur-3xl dark:bg-rose-500/30"
            />
          ) : failed ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/20 opacity-35 blur-3xl"
            />
          ) : (
            // The living multicolor AI glow blooms drifting on the compositor, so
            // the wait while Atlas writes your notes feels alive instead of a flat
            // scrim. Faded toward the edges so the centred text stays readable.
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(120%_90%_at_50%_50%,black,transparent_78%)]"
            >
              <AiGlow mode="active" blend blur={64} density="full" />
            </div>
          )}

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-xl flex-col items-center text-center"
          >
            <motion.div
              animate={
                failed || capacity || reduceMotion
                  ? undefined
                  : { scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }
              }
              transition={
                failed || capacity || reduceMotion
                  ? undefined
                  : { duration: 2.6, ease: "easeInOut", repeat: Infinity }
              }
              className={cn(
                "grid size-16 place-items-center rounded-[6px] border bg-background/90 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_18px_50px_-22px_rgba(0,0,0,0.3)]",
                capacity
                  ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
                  : failed
                  ? "border-destructive/30 text-destructive"
                  : "border-primary/30 text-primary"
              )}
            >
              {failed || capacity ? <AlertCircle className="size-7" /> : <Sparkles className="size-7" />}
            </motion.div>

            <p className="mt-6 text-3xl font-bold tracking-[-0.02em]">
              {title}
            </p>
            {!failed && stage === "analyzing" ? (
              <ThinkingStatus className="max-w-md text-pretty text-sm leading-6 text-muted-foreground" />
            ) : (
              <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-muted-foreground">
                {detail}
              </p>
            )}
            {!failed && subLabel ? (
              <p className="mt-2 text-xs font-medium text-primary/80">{subLabel}</p>
            ) : null}

            {!failed && (stage === "preparing" || stage === "uploading") ? (
              <div className="mt-5 w-full max-w-sm">
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  {typeof progress === "number" ? (
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={false}
                      animate={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                    />
                  ) : (
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-primary"
                      animate={reduceMotion ? undefined : { x: ["-100%", "350%"] }}
                      transition={
                        reduceMotion
                          ? undefined
                          : { duration: 1.2, ease: "easeInOut", repeat: Infinity }
                      }
                    />
                  )}
                </div>
                {typeof progress === "number" ? (
                  <p className="mt-1.5 font-mono text-[0.65rem] text-muted-foreground">
                    {Math.round(Math.min(1, Math.max(0, progress)) * 100)}%
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Extraction + upload run in this tab; closing it mid-flight loses
                the work. Keep this up until the long-run hint appears — by then
                the job is fully server-side, so the green "safe to leave" hint
                and the dashboard button take over. */}
            {!failed && !capacity && stage !== "idle" && !(safeToLeave && showLongRunHint) && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-[6px] border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-sm text-amber-700 dark:text-amber-300">
                <TriangleAlert className="size-4 shrink-0" />
                <span>
                  <span className="font-semibold">Keep this tab open</span> for now.
                </span>
              </div>
            )}

            {failed && onDiscard && onDownload && (
              <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
                {issue?.kind === "silent" ? (
                  <Button onClick={onDiscard} size="lg" className="h-12 gap-2">
                    <Mic className="size-4" />
                    Record again
                  </Button>
                ) : (
                  onRetry && (
                    <Button onClick={onRetry} size="lg" className="h-12 gap-2">
                      <RefreshCcw className="size-4" />
                      Try again
                    </Button>
                  )
                )}
                <Button
                  onClick={() => {
                    onDownload();
                    onClear?.();
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

            {capacity && (
              <>
                <div className="mt-5 inline-flex items-center gap-2 rounded-[6px] border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <Clock className="size-4 shrink-0" />
                  <span>
                    <span className="font-semibold">You can safely close this tab</span> — we&apos;ll finish your notes and email you when they&apos;re ready.
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="mt-7 inline-flex h-12 items-center gap-2 rounded-[6px] border border-border bg-card px-5 text-sm font-medium text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition hover:bg-secondary"
                >
                  <ArrowLeft className="size-4" />
                  Back to dashboard
                </Link>
              </>
            )}

            {!failed && safeToLeave && showLongRunHint && (
              <Link
                href="/dashboard"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-[6px] border border-white/25 bg-white/15 px-5 text-sm font-medium text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:border-foreground/25 hover:bg-background/80"
              >
                <ArrowLeft className="size-4" />
                Back to dashboard
              </Link>
            )}
          </motion.div>

          {/* Long-run hint + optional exit — both appear together after 15 s on the
              processing scrim, once the recording is safely on the server. */}
          <AnimatePresence>
            {showLongRunHint && safeToLeave && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:bottom-8"
              >
                <div className="flex items-start gap-3 rounded-[6px] border border-border bg-card/95 px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm">
                  <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Longer lectures can take a few minutes to process.{" "}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      It&apos;s safe to close this tab or return to the dashboard.
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
