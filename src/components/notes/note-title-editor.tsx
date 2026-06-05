"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving";

export function NoteTitleEditor({
  noteId,
  title,
  onTitleChange,
}: {
  noteId: string;
  title: string;
  onTitleChange: (title: string) => void;
}) {
  const [value, setValue] = useState(title);
  const [saved, setSaved] = useState(title);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [editing]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value, editing]);

  function cancel() {
    setValue(saved);
    setEditing(false);
  }

  async function commit() {
    const next = value.trim().replace(/\s+/g, " ");
    if (!next) {
      toast.error("Title can't be empty.");
      setValue(saved);
      setEditing(false);
      return;
    }

    setValue(next);
    setEditing(false);
    if (next === saved) return;

    const previous = saved;
    setSaved(next);
    onTitleChange(next);
    setStatus("saving");

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSaved(previous);
      setValue(previous);
      onTitleChange(previous);
      toast.error("Couldn't update the title.");
    } finally {
      setStatus("idle");
    }
  }

  if (editing) {
    return (
      <div className="mt-3 flex items-start gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => {
            const nextFocus =
              e.relatedTarget instanceof Node ? e.relatedTarget : null;
            if (!e.currentTarget.parentElement?.contains(nextFocus)) {
              void commit();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          rows={1}
          aria-label="Lecture title"
          className={cn(
            "min-h-[3.75rem] flex-1 resize-none overflow-hidden rounded-xl border border-primary/35 bg-background/80 px-3 py-2 font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] outline-none ring-2 ring-primary/20 transition sm:text-5xl",
            "placeholder:text-muted-foreground"
          )}
        />
        <div className="flex shrink-0 items-center gap-1 pt-2">
          <Button
            type="button"
            size="icon-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void commit()}
            aria-label="Save title"
          >
            <Check className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancel}
            aria-label="Cancel title edit"
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group mt-3 flex items-start gap-2">
      <h1 className="min-w-0 flex-1 text-balance font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] sm:text-5xl">
        {saved}
      </h1>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setEditing(true)}
        aria-label="Edit title"
        className="mt-1 opacity-70 transition group-hover:opacity-100"
      >
        {status === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Pencil className="size-4" />
        )}
      </Button>
    </div>
  );
}
