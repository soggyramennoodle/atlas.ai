"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileAudio } from "lucide-react";
import { GLASS_LIGHT } from "@/components/app/glass";
import { cn } from "@/lib/utils";

/**
 * Collapsible "Full Transcript" panel (§9). Collapsed by default; expands with
 * a smooth height + blur-to-clear reveal using AnimatePresence and a `layout`
 * motion container. Reads as glass chrome (a frosted sheet) against the
 * editorial canvas, per the cinematic-light contract.
 */
export function TranscriptPanel({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.section
      layout
      className={cn(
        "overflow-hidden rounded-3xl",
        GLASS_LIGHT,
        // Reads as a distinct frosted sheet, not a ghost on the canvas.
        "bg-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(13,13,13,0.04),0_24px_60px_-36px_rgba(13,13,13,0.3)]"
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-3 px-6 py-4 text-left outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-black/25"
        aria-expanded={open}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-black/[0.1] bg-white text-[#0d0d0d]">
          <FileAudio className="size-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium tracking-tight text-[#0d0d0d]">
            Full transcript
          </span>
          <span className="block text-xs text-[#0d0d0d]/55">
            The complete lecture, word for word. Transcript may be inaccurate.
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-[#0d0d0d]/55"
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
            <div className="max-h-[28rem] overflow-y-auto border-t border-black/[0.08] px-6 py-5">
              <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-[#0d0d0d]/60">
                {transcript}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
