"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { browserSupportsPasskeys } from "@/lib/passkeys";
import { PILL_PRIMARY, PILL_SECONDARY } from "@/components/app/pills";

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
      <div
        aria-hidden
        className="absolute inset-0 bg-[#f4f3f1]/85 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-black/[0.08] bg-white p-7 shadow-[0_24px_70px_-42px_rgba(13,13,13,0.45)] sm:p-8">
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing || registering}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-[#0d0d0d]/45 outline-none transition hover:bg-black/[0.04] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-60"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>

        <span className="grid size-12 place-items-center rounded-full border border-black/[0.10] bg-[#f4f3f1] text-[#0d0d0d]">
          <Fingerprint className="size-6" />
        </span>
        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
          Faster sign-in
        </p>
        <h2
          id="passkey-prompt-title"
          className="mt-2 text-3xl font-normal tracking-[-0.02em] text-[#0d0d0d]"
        >
          Save a passkey?
        </h2>
        <p className="mt-3 text-pretty text-sm leading-6 text-[#0d0d0d]/60">
          Sign in next time with Face ID, Touch ID, or your device PIN — no
          email link required.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className={PILL_PRIMARY}
            onClick={() => void register()}
            disabled={registering || dismissing}
          >
            {registering && <Loader2 className="size-4 animate-spin" />}
            <Fingerprint className="size-4" />
            Save passkey
          </button>
          <button
            type="button"
            onClick={() => void dismiss()}
            disabled={registering || dismissing}
            className={PILL_SECONDARY}
          >
            {dismissing && <Loader2 className="size-4 animate-spin" />}
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
