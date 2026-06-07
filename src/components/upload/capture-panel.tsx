"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Recorder } from "@/components/upload/recorder";
import { Uploader } from "@/components/upload/uploader";
import { useRecording } from "@/components/recording/recording-context";

type Mode = "record" | "upload";

export function CapturePanel({ userId }: { userId: string }) {
  const [mode, setMode] = useState<Mode>("record");
  const { phase } = useRecording();
  const reduceMotion = useReducedMotion();

  // §7: once a recording is in flight, the selector slides away so the
  // recorder can take over the screen. It returns when the session resets.
  const recordingLive = phase === "recording" || phase === "paused";

  return (
    <div>
      <AnimatePresence initial={false}>
        {!recordingLive && (
          <motion.div
            key="selector"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            className="overflow-hidden"
          >
            {/* Segmented control — recording leads, upload is the quieter option. */}
            <div
              data-tour="capture-modes"
              className="mx-auto grid w-full max-w-sm grid-cols-2 gap-1 rounded-[4px] border border-border bg-card p-1"
            >
              {(
                [
                  { id: "record", label: "Record now", icon: Mic },
                  { id: "upload", label: "Upload a file", icon: Upload },
                ] as const
              ).map((t) => {
                const active = mode === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setMode(t.id)}
                    className={cn(
                      "relative flex items-center justify-center gap-2 rounded-[3px] px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="capture-pill"
                        className="absolute inset-0 rounded-[3px] bg-foreground"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 400, damping: 32 }
                        }
                      />
                    )}
                    <t.icon className="relative size-4" />
                    <span className="relative">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={mode === "record" ? "mt-7" : "mx-auto mt-7 max-w-2xl"}>
        {mode === "record" ? (
          <motion.div
            key="record"
            data-tour="capture-recorder"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Recorder />
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Uploader userId={userId} />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Already have a recording? Drop it in. Most students just{" "}
              <button
                onClick={() => setMode("record")}
                className="text-primary underline-offset-2 hover:underline"
              >
                record in the browser
              </button>
              .
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
