"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { browserSupportsPasskeys } from "@/lib/passkeys";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PasskeyEnrollmentPrompt({
  dismissedAt,
}: {
  dismissedAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (dismissedAt || !browserSupportsPasskeys()) return;

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.passkey.list();
      if (cancelled || error) return;
      if ((data?.length ?? 0) === 0) {
        setOpen(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dismissedAt]);

  async function dismiss() {
    setDismissing(true);
    try {
      const res = await fetch("/api/profile/passkey-prompt", { method: "POST" });
      if (!res.ok) throw new Error();
      setOpen(false);
    } catch {
      toast.error("Couldn't save your preference.");
    } finally {
      setDismissing(false);
    }
  }

  async function register() {
    setRegistering(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();
      if (error) {
        if (error.name === "WebAuthnUnknownError") {
          toast.message("Passkey setup was cancelled.");
          return;
        }
        toast.error(error.message || "Couldn't save your passkey.");
        return;
      }
      await fetch("/api/profile/passkey-prompt", { method: "POST" });
      toast.success("Passkey saved. You can sign in faster next time.");
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save your passkey."
      );
    } finally {
      setRegistering(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passkey-prompt-title"
    >
      <div aria-hidden className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-[4px] border border-border bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing || registering}
          className="absolute right-4 top-4 rounded-[3px] p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>

        <span className="grid size-12 place-items-center rounded-[4px] border border-border bg-background text-foreground">
          <Fingerprint className="size-6" />
        </span>
        <h2
          id="passkey-prompt-title"
          className="mt-5 text-2xl font-bold tracking-tight"
        >
          Save a passkey?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Sign in next time with Face ID, Touch ID, or your device PIN — no
          email link required.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={() => void register()}
            disabled={registering || dismissing}
          >
            {registering && <Loader2 className="size-4 animate-spin" />}
            <Fingerprint className="size-4" />
            Save passkey
          </Button>
          <button
            type="button"
            onClick={() => void dismiss()}
            disabled={registering || dismissing}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full text-muted-foreground"
            )}
          >
            {dismissing && <Loader2 className="size-4 animate-spin" />}
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
