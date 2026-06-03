"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteNote } from "@/app/(app)/notes/[id]/actions";
import { Button } from "@/components/ui/button";

export function DeleteNoteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteNote(id);
      } catch {
        toast.error("Couldn't delete this note. Please try again.");
      }
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
