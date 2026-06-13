"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * The course/subject capsule shown above the lecture title. Inline-editable at
 * all times (§3): single click to edit, Enter or blur to save, with an
 * optimistic UI update and a background PATCH to the note.
 */
export function CourseCapsule({
  noteId,
  subject,
}: {
  noteId: string;
  subject: string | null;
}) {
  const [value, setValue] = useState(subject ?? "");
  const [saved, setSaved] = useState(subject ?? "");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    setEditing(false);
    const next = value.trim();
    if (next === saved) return;
    // Optimistic: keep the new value on screen, roll back on failure.
    setSaved(next);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: next || null }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSaved(saved);
      setValue(saved);
      toast.error("Couldn't update the course.");
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(saved);
            setEditing(false);
          }
        }}
        placeholder="Add a course…"
        className="rounded-full border border-white/35 bg-white/[0.1] px-3.5 py-1 text-sm font-medium text-white caret-white outline-none ring-2 ring-white/20 backdrop-blur-md placeholder:text-white/40"
      />
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => setEditing(true)}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm font-medium outline-none backdrop-blur-md transition duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/40",
        saved
          ? "border-white/20 bg-white/[0.08] text-white/85 hover:bg-white/[0.16]"
          : "border-dashed border-white/25 text-white/60 hover:text-white"
      )}
      title="Click to edit course"
    >
      {saved || "Add a course"}
    </motion.button>
  );
}
