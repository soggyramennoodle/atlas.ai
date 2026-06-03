"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Recorder } from "@/components/upload/recorder";
import { Uploader } from "@/components/upload/uploader";

type Mode = "record" | "upload";

export function CapturePanel({ userId }: { userId: string }) {
  const [mode, setMode] = useState<Mode>("record");

  return (
    <div>
      {/* Segmented control — recording leads, upload is the quieter option. */}
      <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-1 rounded-full border bg-card/60 p-1">
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
                "relative flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="capture-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-7">
        {mode === "record" ? (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Recorder userId={userId} />
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
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
