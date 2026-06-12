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
        className="rounded-full border border-black/30 bg-white px-3.5 py-1 text-sm font-medium text-[#0d0d0d] outline-none ring-2 ring-black/15 placeholder:text-[#0d0d0d]/40"
      />
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => setEditing(true)}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm font-medium outline-none transition duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-black/25",
        saved
          ? "border-black/[0.12] bg-white text-[#0d0d0d]/80 hover:border-black/25 hover:bg-black/[0.03]"
          : "border-dashed border-black/[0.12] text-[#0d0d0d]/55 hover:text-[#0d0d0d]"
      )}
      title="Click to edit course"
    >
      {saved || "Add a course"}
    </motion.button>
  );
}
