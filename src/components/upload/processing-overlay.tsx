"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowLeft, Clock, Download, Mic, RefreshCcw, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { AiGlow } from "@/components/ui/ai-glow";
import { GlassPanel } from "@/components/app/glass";
import {
  PILL_PRIMARY_INLINE,
  PILL_SECONDARY_INLINE,
} from "@/components/app/pills";
import { ThinkingStatus } from "@/components/upload/thinking-status";
import { cn } from "@/lib/utils";
import type { CaptureStage } from "@/lib/upload-lecture";

/* Stage titles carry the single serif-italic accent of this surface. */
const STAGE_TITLE: Record<Exclude<CaptureStage, "idle">, React.ReactNode> = {
  preparing: (
    <>
      Extracting <span className="font-instrument italic">audio…</span>
    </>
  ),
  uploading: (
    <>
      Saving your <span className="font-instrument italic">recording…</span>
    </>
  ),
  analyzing: (
    <>
      Atlas is{" "}
      <span className="font-instrument italic">writing your notes…</span>
    </>
  ),
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

/**
 * Full-screen processing stage: aurora-through-glass (spec decision 3). The
 * multicolor AiGlow blooms across the frosted #fafafa scrim and arrives at the
 * eye as light bleeding through the frosted glass status panel — the brand's
 * one color moment.
 */
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

  const title =
    issue?.title ?? (stage === "idle" ? null : STAGE_TITLE[stage]);
  const detail = issue?.message ?? (stage === "idle" ? "" : STAGE_DETAIL[stage]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
          className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#f4f3f1]/90 px-4 backdrop-blur-md"
        >
          {capacity ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/25 opacity-70 blur-3xl"
            />
          ) : failed ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/[0.08] blur-3xl"
            />
          ) : (
            // The living multicolor AI glow blooms on the compositor behind the
            // frosted panel, so the wait feels alive — color as light through
            // glass instead of a flat scrim.
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
            className="relative w-full max-w-xl"
          >
            <GlassPanel
              variant="light"
              className="flex w-full flex-col items-center px-6 py-10 text-center sm:px-10"
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
                  "grid size-16 place-items-center rounded-full border border-black/[0.1] bg-white/85 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-22px_rgba(0,0,0,0.25)]",
                  capacity
                    ? "text-orange-500"
                    : failed
                      ? "text-[#0d0d0d]"
                      : "text-[#0d0d0d]/80"
                )}
              >
                {failed || capacity ? (
                  <AlertCircle className="size-7" />
                ) : (
                  <Sparkles className="size-7" />
                )}
              </motion.div>

              <p className="mt-6 text-3xl font-normal tracking-[-0.02em]">
                {title}
              </p>
              {!failed && stage === "analyzing" ? (
                <ThinkingStatus className="max-w-md text-pretty text-sm leading-6 text-[#0d0d0d]/60" />
              ) : (
                <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-[#0d0d0d]/60">
                  {detail}
                </p>
              )}
              {!failed && subLabel ? (
                <p className="mt-2 text-xs font-medium text-[#0d0d0d]/70">
                  {subLabel}
                </p>
              ) : null}

              {!failed && (stage === "preparing" || stage === "uploading") ? (
                <div className="mt-5 w-full max-w-sm">
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.08]">
                    {typeof progress === "number" ? (
                      <motion.div
                        className="h-full rounded-full bg-[#0d0d0d]"
                        initial={false}
                        animate={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                      />
                    ) : (
                      <motion.div
                        className="h-full w-1/3 rounded-full bg-[#0d0d0d]"
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
                    <p className="mt-1.5 text-[0.65rem] tabular-nums text-[#0d0d0d]/55">
                      {Math.round(Math.min(1, Math.max(0, progress)) * 100)}%
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Extraction + upload run in this tab; closing it mid-flight loses
                  the work. Keep this up until the long-run hint appears — by then
                  the job is fully server-side, so the "safe to leave" hint and
                  the dashboard button take over. */}
              {!failed && !capacity && stage !== "idle" && !(safeToLeave && showLongRunHint) && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-sm text-amber-700">
                  <TriangleAlert className="size-4 shrink-0" />
                  <span>
                    <span className="font-medium">Keep this tab open</span> for now.
                  </span>
                </div>
              )}

              {failed && onDiscard && onDownload && (
                <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
                  {issue?.kind === "silent" ? (
                    <button onClick={onDiscard} className={PILL_PRIMARY_INLINE}>
                      <Mic className="size-4" />
                      Record again
                    </button>
                  ) : (
                    onRetry && (
                      <button onClick={onRetry} className={PILL_PRIMARY_INLINE}>
                        <RefreshCcw className="size-4" />
                        Try again
                      </button>
                    )
                  )}
                  <button
                    onClick={() => {
                      onDownload();
                      onClear?.();
                    }}
                    className={PILL_SECONDARY_INLINE}
                  >
                    <Download className="size-4" />
                    Download audio
                  </button>
                  <button
                    onClick={onDiscard}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm text-[#0d0d0d]/55 outline-none transition hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
                  >
                    <Trash2 className="size-4" />
                    Discard
                  </button>
                </div>
              )}

              {capacity && (
                <>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-600/35 bg-emerald-600/10 px-3.5 py-2 text-sm text-emerald-700">
                    <Clock className="size-4 shrink-0" />
                    <span>
                      <span className="font-medium">You can safely close this tab</span> — we&apos;ll finish your notes and email you when they&apos;re ready.
                    </span>
                  </div>
                  <Link href="/dashboard" className={cn(PILL_SECONDARY_INLINE, "mt-7")}>
                    <ArrowLeft className="size-4" />
                    Back to dashboard
                  </Link>
                </>
              )}

              {!failed && safeToLeave && showLongRunHint && (
                <Link href="/dashboard" className={cn(PILL_SECONDARY_INLINE, "mt-7")}>
                  <ArrowLeft className="size-4" />
                  Back to dashboard
                </Link>
              )}
            </GlassPanel>
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
                <GlassPanel
                  variant="light"
                  className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
                >
                  <Clock className="mt-0.5 size-4 shrink-0 text-[#0d0d0d]/50" />
                  <p className="text-left text-sm leading-relaxed text-[#0d0d0d]/60">
                    Longer lectures can take a few minutes to process.{" "}
                    <span className="font-medium text-emerald-700">
                      It&apos;s safe to close this tab or return to the dashboard.
                    </span>
                  </p>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
