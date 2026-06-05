"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileAudio } from "lucide-react";

/**
 * Collapsible "Full Transcript" panel (§9). Collapsed by default; expands with
 * a smooth height + blur-to-clear reveal using AnimatePresence and a `layout`
 * motion container.
 */
export function TranscriptPanel({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.section
      layout
      className="overflow-hidden rounded-[4px] border border-border bg-card"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-secondary"
        aria-expanded={open}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[4px] border border-border bg-background text-foreground">
          <FileAudio className="size-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold tracking-tight">
            Full transcript
          </span>
          <span className="block text-xs text-muted-foreground">
            The complete lecture, word for word. Transcript may be inaccurate.
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="size-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="transcript-body"
            initial={{ height: 0, opacity: 0, filter: "blur(8px)" }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="max-h-[28rem] overflow-y-auto border-t px-6 py-5">
              <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-muted-foreground">
                {transcript}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
