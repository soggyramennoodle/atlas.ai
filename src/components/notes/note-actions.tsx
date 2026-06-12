"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteNote } from "@/app/(app)/notes/[id]/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Quiet ghost pill for the note header's action row. */
const GHOST_PILL =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-[#0d0d0d]/55 outline-none transition hover:bg-black/[0.03] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25 disabled:pointer-events-none disabled:opacity-60";

export function DownloadAudioButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function downloadAudio() {
    setBusy(true);
    try {
      const res = await fetch(`/api/notes/${id}/audio`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? "lecture-audio.zip";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't download the recording.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={GHOST_PILL}
      onClick={downloadAudio}
      disabled={busy}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Audio
    </button>
  );
}

/** Export dropdown — downloads the note as a PDF or DOCX (§4). */
export function ExportMenu({ id }: { id: string }) {
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);

  async function download(format: "pdf" | "docx") {
    setBusy(format);
    try {
      const res = await fetch(`/api/notes/${id}/export?format=${format}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      // Pull the server-provided filename when present.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `notes.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Couldn't export as ${format.toUpperCase()}.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={GHOST_PILL}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 rounded-2xl border-black/[0.08] bg-white p-1.5 text-[#0d0d0d] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.35)]"
      >
        <DropdownMenuItem
          onSelect={() => download("pdf")}
          disabled={!!busy}
          className="rounded-xl focus:bg-black/[0.03]"
        >
          <FileText className="size-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => download("docx")}
          disabled={!!busy}
          className="rounded-xl focus:bg-black/[0.03]"
        >
          <FileText className="size-4" />
          Export as DOCX
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DeleteNoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      // The action returns a result rather than throwing/redirecting, so a
      // successful delete can no longer be mistaken for a failure (§12).
      const result = await deleteNote(id);
      if (!result.ok) {
        toast.error("Couldn't delete this note. Please try again.");
        return;
      }
      // Reassess what Atlas learned now that this note is gone — best-effort
      // and non-blocking. `keepalive` lets it finish after we navigate away.
      void fetch("/api/memory/reassess", {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
      toast.success("Note deleted.");
      router.push("/dashboard");
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className={GHOST_PILL}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4" />
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[#0d0d0d]/55">Delete this note?</span>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white outline-none transition hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Yes, delete
      </button>
      <button
        type="button"
        className={GHOST_PILL}
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancel
      </button>
    </div>
  );
}
