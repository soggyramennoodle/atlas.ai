"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        className={cn(
          "gap-1.5 border-destructive/55 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive",
          fullWidth && "w-full justify-start",
          className
        )}
      >
        <Flag className="size-4" />
        Report
      </Button>
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

  useEffect(() => {
    if (!open) return;
    setCategory(context === "note" ? "inaccurate" : "other");
    setMessage("");
    setSubmitting(false);
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

  return (
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
            className="absolute inset-0 bg-foreground/45"
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
            className="relative z-10 w-full max-w-lg rounded-[4px] border border-border bg-card p-5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-destructive/30 bg-destructive/10 text-destructive">
                  <AlertCircle className="size-5" />
                </span>
                <div>
                  <h2 id={titleId} className="text-lg font-bold tracking-tight">
                    {context === "note" ? "Report this note" : "Send feedback"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">
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
                className="grid size-8 shrink-0 place-items-center rounded-[4px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {noteTitle && (
              <p className="mt-4 rounded-[4px] border border-border bg-secondary px-3 py-2 text-sm">
                <span className="text-muted-foreground">Note: </span>
                <span className="font-medium">{noteTitle}</span>
              </p>
            )}

            <div className="mt-5 space-y-2">
              <Label>What happened?</Label>
              <div className="grid gap-2">
                {CATEGORIES.map((item) => {
                  const active = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={cn(
                        "rounded-[4px] border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-destructive/50 bg-destructive/10"
                          : "border-border bg-background hover:bg-secondary"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium",
                          active ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="report-message">Details (optional)</Label>
              <Textarea
                id="report-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  context === "note"
                    ? "Which part was off? The more specific, the better."
                    : "What should we know?"
                }
                rows={4}
                className="rounded-[4px]"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={submit}
                disabled={submitting}
                className="gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Flag className="size-4" />
                )}
                Submit report
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
