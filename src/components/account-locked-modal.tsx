"use client";

import { useState } from "react";
import { Loader2, Lock, LogOut, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccessRevocationKind } from "@/lib/types";

const SUPPORT_EMAIL = "hello@atlasai.ca";

const COPY: Record<
  AccessRevocationKind,
  { title: string; body: string }
> = {
  banned: {
    title: "Account locked",
    body: "This account has been locked and can't stay signed in. If you think this is a mistake, reach out and we'll help sort it out.",
  },
  global_logout: {
    title: "Signed out by Atlas",
    body: "Atlas ended your session for maintenance or security. Sign in again when you're ready to continue.",
  },
};

export function AccountLockedModal({
  kind,
  onExit,
}: {
  kind: AccessRevocationKind;
  onExit: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const copy = COPY[kind];

  async function handleExit() {
    if (pending) return;
    setPending(true);
    try {
      await onExit();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-locked-title"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.45),rgba(127,29,29,0.72)_55%,rgba(15,23,42,0.92))] backdrop-blur-[2px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.35),transparent_65%)]"
      />

      <div className="relative w-full max-w-md rounded-[4px] border border-destructive/35 bg-card p-8 text-center shadow-[0_0_0_1px_rgba(248,113,113,0.15),0_24px_80px_-20px_rgba(127,29,29,0.65)]">
        <span className="mx-auto grid size-12 place-items-center rounded-[4px] border border-destructive/40 bg-destructive/10 text-destructive">
          <Lock className="size-6" />
        </span>
        <h2
          id="account-locked-title"
          className="mt-5 text-2xl font-bold tracking-tight text-destructive"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{copy.body}</p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={cn(buttonVariants(), "w-full")}
          >
            <Mail className="size-4" />
            Contact {SUPPORT_EMAIL}
          </a>
          <button
            type="button"
            onClick={handleExit}
            disabled={pending}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "w-full"
            )}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Exit Atlas
          </button>
        </div>
      </div>
    </div>
  );
}
