"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving";

/** Small round icon pill used for the save/cancel/edit title controls. */
const TITLE_ICON_BUTTON =
  "grid size-8 shrink-0 place-items-center rounded-full text-[#0d0d0d]/60 outline-none transition hover:bg-black/[0.05] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25 disabled:pointer-events-none disabled:opacity-60";

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
            "min-h-[3.75rem] flex-1 resize-none overflow-hidden rounded-2xl border border-black/[0.12] bg-white px-3 py-2 text-4xl font-normal leading-[1.02] tracking-[-0.02em] text-[#0d0d0d] outline-none transition focus-visible:ring-2 focus-visible:ring-black/25 sm:text-5xl",
            "placeholder:text-[#0d0d0d]/40"
          )}
        />
        <div className="flex shrink-0 items-center gap-1 pt-2">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void commit()}
            aria-label="Save title"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0d0d0d] text-white outline-none transition hover:scale-[1.04] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
          >
            <Check className="size-3" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancel}
            aria-label="Cancel title edit"
            className={TITLE_ICON_BUTTON}
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
    );
  }

  // The note view's major heading: the user's own title, with the final word
  // carrying the surface's single serif-italic accent.
  const words = saved.split(" ");
  const lead = words.slice(0, -1).join(" ");
  const accent = words[words.length - 1];

  return (
    <div className="group mt-3 flex items-start gap-2">
      <h1 className="min-w-0 flex-1 text-balance text-4xl font-normal leading-[1.05] tracking-[-0.02em] text-[#0d0d0d] sm:text-5xl">
        {lead ? <>{lead} </> : null}
        <span className="font-instrument italic">{accent}</span>
      </h1>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit title"
        className={cn(TITLE_ICON_BUTTON, "mt-1 opacity-70 transition group-hover:opacity-100")}
      >
        {status === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Pencil className="size-4" />
        )}
      </button>
    </div>
  );
}
