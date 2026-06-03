"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteNote } from "@/app/(app)/notes/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => download("pdf")} disabled={!!busy}>
          <FileText className="size-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => download("docx")} disabled={!!busy}>
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
      toast.success("Note deleted.");
      router.push("/dashboard");
    });
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Delete this note?</span>
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={pending}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Yes, delete
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  );
}
