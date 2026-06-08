"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM_PHRASE = "log out everyone";

export function LogoutAllButton() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  const matches =
    confirmation.trim().toLowerCase() === CONFIRM_PHRASE;

  function run() {
    if (!matches) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/access/logout-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        queued?: number;
        skipped?: number;
      } | null;

      if (res.ok && json?.ok) {
        toast.success(
          `Queued sign-out for ${json.queued ?? 0} accounts (${json.skipped ?? 0} admins skipped).`
        );
        setOpen(false);
        setConfirmation("");
      } else {
        toast.error(json?.error ?? "Couldn't queue sign-outs.");
      }
    });
  }

  return (
    <div className="rounded-[4px] border border-destructive/30 bg-card p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[4px] border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-destructive">Log out everyone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Queues a sign-out for every non-admin account. Users mid-recording
            finish uploading first; processing sessions end immediately. Admins
            are never signed out.
          </p>
        </div>
      </div>

      {!open ? (
        <Button
          variant="destructive"
          className="mt-5"
          onClick={() => setOpen(true)}
        >
          <LogOut className="size-4" />
          Log out everyone
        </Button>
      ) : (
        <div className="mt-5 space-y-3 rounded-[4px] border border-destructive/25 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground">
            Type <strong className="text-foreground">{CONFIRM_PHRASE}</strong> to
            confirm.
          </p>
          <div className="space-y-2">
            <Label htmlFor="logout-all-confirm">Confirmation</Label>
            <Input
              id="logout-all-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={run}
              disabled={!matches || pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Confirm log out everyone
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (pending) return;
                setOpen(false);
                setConfirmation("");
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
