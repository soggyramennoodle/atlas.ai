"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PILL_PRIMARY_INLINE } from "@/components/app/pills";
import { cn } from "@/lib/utils";
import type { FeedbackCategory } from "@/lib/types";

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "inaccurate",
    label: "Inaccurate notes",
    description: "Something was missing, fuzzy, or didn't match the lecture.",
  },
  {
    id: "wrong",
    label: "Wrong information",
    description: "A fact, definition, or summary was incorrect.",
  },
  {
    id: "other",
    label: "Other feedback",
    description: "Bugs, ideas, or anything else about Atlas.",
  },
];

type ReportContext = "note" | "general";

/* Quiet ghost pill — reporting is a utility action, not an alarm. Surfaces
   that host the button on dark glass (the sidebar rail) override via
   className; tailwind-merge resolves the conflicts. */
const REPORT_PILL =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-black/[0.12] bg-transparent px-4 text-sm font-medium text-[#0d0d0d]/70 outline-none transition hover:bg-black/[0.03] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25";

export function ReportButton({
  context,
  noteId,
  noteTitle,
  className,
  size = "sm",
  fullWidth,
}: {
  context: ReportContext;
  noteId?: string;
  noteTitle?: string;
  className?: string;
  size?: "sm" | "default";
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          REPORT_PILL,
          size === "default" && "h-10",
          fullWidth && "w-full justify-start",
          className
        )}
      >
        <Flag className="size-4" />
        Report
      </button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        context={context}
        noteId={noteId}
        noteTitle={noteTitle}
      />
    </>
  );
}

function ReportDialog({
  open,
  onOpenChange,
  context,
  noteId,
  noteTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ReportContext;
  noteId?: string;
  noteTitle?: string;
}) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<FeedbackCategory>(
    context === "note" ? "inaccurate" : "other"
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset on open. Deferred a microtask to satisfy the no-sync-setState-in-
  // effect lint rule (project gotcha).
  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => {
      setCategory(context === "note" ? "inaccurate" : "other");
      setMessage("");
      setSubmitting(false);
    });
  }, [open, context]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim() || null,
          noteId: noteId ?? null,
          pagePath: window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Thanks — your report was sent.");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't send your report. Please try again.");
      setSubmitting(false);
    }
  }

  // Portaled to <body>: the sidebar rail's backdrop-filter creates a
  // containing block, which would otherwise trap this `fixed` dialog inside
  // the rail's bounds.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-4 sm:items-center">
          <motion.button
            type="button"
            aria-label="Close report dialog"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="absolute inset-0 bg-[#0d0d0d]/30 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-black/[0.08] bg-white p-5 text-[#0d0d0d] shadow-[0_1px_2px_rgba(13,13,13,0.05),0_36px_90px_-40px_rgba(13,13,13,0.45)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-black/[0.1] bg-black/[0.03] text-[#0d0d0d]">
                  <Flag className="size-4" />
                </span>
                <div>
                  <h2
                    id={titleId}
                    className="text-xl font-normal tracking-[-0.01em]"
                  >
                    {context === "note" ? (
                      <>
                        Report this{" "}
                        <span className="font-instrument italic">note</span>
                      </>
                    ) : (
                      <>
                        Send{" "}
                        <span className="font-instrument italic">feedback</span>
                      </>
                    )}
                  </h2>
                  <p className="mt-1 text-pretty text-sm leading-6 text-[#0d0d0d]/55">
                    {context === "note"
                      ? "Tell us what went wrong so we can improve future generations."
                      : "Share a bug, idea, or anything that would make Atlas better."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="grid size-8 shrink-0 place-items-center rounded-full text-[#0d0d0d]/45 outline-none transition hover:bg-black/[0.05] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
              >
                <X className="size-4" />
              </button>
            </div>

            {noteTitle && (
              <p className="mt-4 truncate rounded-full border border-black/[0.08] bg-black/[0.03] px-4 py-2 text-sm">
                <span className="text-[#0d0d0d]/50">Note: </span>
                <span className="font-medium">{noteTitle}</span>
              </p>
            )}

            <fieldset className="mt-5">
              <legend className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/45">
                What happened?
              </legend>
              <div className="mt-2.5 grid gap-2">
                {CATEGORIES.map((item) => {
                  const active = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-black/25",
                        active
                          ? "border-[#0d0d0d] bg-black/[0.03]"
                          : "border-black/[0.1] hover:border-black/25"
                      )}
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#0d0d0d]/55">
                          {item.description}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition",
                          active
                            ? "border-[#0d0d0d] bg-[#0d0d0d] text-white"
                            : "border-black/[0.18] text-transparent"
                        )}
                      >
                        <Check className="size-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-4">
              <label
                htmlFor="report-message"
                className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#0d0d0d]/45"
              >
                Details (optional)
              </label>
              <textarea
                id="report-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  context === "note"
                    ? "Which part was off? The more specific, the better."
                    : "What should we know?"
                }
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-black/[0.12] bg-black/[0.02] px-4 py-3 text-sm leading-6 text-[#0d0d0d] outline-none transition placeholder:text-[#0d0d0d]/40 focus:border-black/30 focus-visible:ring-2 focus-visible:ring-black/25"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-[#0d0d0d]/55 outline-none transition hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25 disabled:pointer-events-none disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className={cn(PILL_PRIMARY_INLINE, "h-11")}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Flag className="size-4" />
                )}
                Submit report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
