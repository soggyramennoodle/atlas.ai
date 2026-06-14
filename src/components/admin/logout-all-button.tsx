"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_BTN,
  ADMIN_BTN_GHOST,
  ADMIN_BTN_PRIMARY,
  ADMIN_INPUT,
  CARD,
  cn,
} from "@/components/admin/admin-kit";

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
    <div className={cn(CARD, "p-6 sm:p-7")}>
      <div className="flex items-start gap-3.5">
        {/* Drastic action: amber attention, never a red block. */}
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-amber-300/35 bg-amber-300/15 text-amber-200">
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-white">Log out everyone</h2>
          <p className="mt-1 text-sm leading-6 text-white/70">
            Queues a sign-out for every non-admin account. Users mid-recording
            finish uploading first; processing sessions end immediately. Admins
            are never signed out.
          </p>
        </div>
      </div>

      {!open ? (
        <button
          type="button"
          className={`${ADMIN_BTN} mt-5 h-10`}
          onClick={() => setOpen(true)}
        >
          <LogOut className="size-4" />
          Log out everyone
        </button>
      ) : (
        <div className="mt-5 space-y-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.08] p-4">
          <p className="text-sm text-white/70">
            Type{" "}
            <strong className="font-medium text-white">
              {CONFIRM_PHRASE}
            </strong>{" "}
            to confirm.
          </p>
          <div className="space-y-2">
            <label
              htmlFor="logout-all-confirm"
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/50"
            >
              Confirmation
            </label>
            <input
              id="logout-all-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              className={ADMIN_INPUT}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${ADMIN_BTN_PRIMARY} h-10`}
              onClick={run}
              disabled={!matches || pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Confirm log out everyone
            </button>
            <button
              type="button"
              className={`${ADMIN_BTN_GHOST} h-10`}
              onClick={() => {
                if (pending) return;
                setOpen(false);
                setConfirmation("");
              }}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
