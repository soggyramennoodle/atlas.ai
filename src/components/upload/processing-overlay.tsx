"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Download, Mic, RefreshCcw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CaptureStage } from "@/lib/upload-lecture";

const STAGE_COPY: Record<Exclude<CaptureStage, "idle">, string> = {
  uploading: "Saving your recording...",
  analyzing: "Atlas is writing your notes...",
};

const STAGE_DETAIL: Record<Exclude<CaptureStage, "idle">, string> = {
  uploading: "Sending the audio into your private Atlas workspace.",
  analyzing: "Keep this tab open while Atlas listens for the important parts.",
};

export interface ProcessingIssue {
  kind: "silent" | "timeout" | "failed";
  title: string;
  message: string;
}

export function ProcessingOverlay({
  stage,
  issue,
  onRetry,
  onClear,
  onDiscard,
  onDownload,
}: {
  stage: CaptureStage;
  issue?: ProcessingIssue | null;
  onRetry?: () => void;
  onClear?: () => void;
  onDiscard?: () => void;
  onDownload?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const visible = stage !== "idle" || !!issue;
  const failed = !!issue;
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
          className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/88 px-4"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-aurora opacity-45"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(70%_55%_at_50%_45%,black,transparent)]"
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35 blur-3xl",
              failed ? "bg-destructive/20" : "bg-primary/20"
            )}
          />

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-xl flex-col items-center text-center"
          >
            <div
              className={cn(
                "grid size-16 place-items-center rounded-full border bg-background/80 shadow-[0_18px_80px_-42px_color-mix(in_oklch,var(--primary)_90%,transparent)]",
                failed ? "border-destructive/30 text-destructive" : "border-primary/30 text-primary"
              )}
            >
              {failed ? <AlertCircle className="size-7" /> : <Sparkles className="size-7" />}
            </div>

            <p className="mt-6 font-display text-2xl font-semibold tracking-tight">
              {title}
            </p>
            <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-muted-foreground">
              {detail}
            </p>

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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
