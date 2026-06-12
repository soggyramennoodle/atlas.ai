"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { browserSupportsPasskeys } from "@/lib/passkeys";
import { PILL_SECONDARY_INLINE } from "@/components/app/pills";

type PasskeyRow = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

function formatPasskeyDate(iso: string | undefined): string {
  if (!iso) return "Never";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PasskeysPanel() {
  const supported = browserSupportsPasskeys();
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [loading, setLoading] = useState(supported);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supported) return;
    const supabase = createClient();
    const { data, error } = await supabase.auth.passkey.list();
    if (error) {
      console.error("Passkey list failed:", error);
      toast.error("Couldn't load your passkeys.");
      return;
    }
    setPasskeys((data as PasskeyRow[] | null) ?? []);
  }, [supported]);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.passkey.list();
      if (cancelled) return;
      if (error) {
        console.error("Passkey list failed:", error);
        toast.error("Couldn't load your passkeys.");
      } else {
        setPasskeys((data as PasskeyRow[] | null) ?? []);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function addPasskey() {
    setAdding(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();
      if (error) {
        if (error.name === "WebAuthnUnknownError") {
          toast.message("Passkey setup was cancelled.");
          return;
        }
        toast.error(error.message || "Couldn't add a passkey.");
        return;
      }
      toast.success("Passkey added.");
      await refresh();
    } finally {
      setAdding(false);
    }
  }

  async function removePasskey(id: string) {
    setRemovingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.passkey.delete({ passkeyId: id });
      if (error) {
        toast.error(error.message || "Couldn't remove that passkey.");
        return;
      }
      toast.success("Passkey removed.");
      setPasskeys((rows) => rows.filter((row) => row.id !== id));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="border-b border-black/[0.08] pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
            Sign-in methods
          </p>
          <h2 className="mt-2 text-3xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
            Passkeys
          </h2>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[#0d0d0d]/60">
            Sign in with Face ID, Touch ID, or your device PIN instead of
            waiting on a magic link.
          </p>
        </div>
        {supported && (
          <button
            type="button"
            className={`${PILL_SECONDARY_INLINE} h-10 shrink-0 px-4 text-xs`}
            onClick={() => void addPasskey()}
            disabled={adding || loading}
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            Add passkey
          </button>
        )}
      </div>

      {!supported ? (
        <p className="mt-5 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-[#0d0d0d]/60">
          Your browser doesn&apos;t support passkeys on this device.
        </p>
      ) : loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-[#0d0d0d]/55">
          <Loader2 className="size-4 animate-spin" />
          Loading passkeys…
        </div>
      ) : passkeys.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-[#0d0d0d]/60">
          No passkeys saved yet. Add one to sign in faster next time.
        </p>
      ) : (
        <ul className="mt-6 border-y border-black/[0.08]">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-4 border-b border-black/[0.08] py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#0d0d0d]">
                  {passkey.friendly_name?.trim() || "Passkey"}
                </p>
                <p className="mt-1 text-xs text-[#0d0d0d]/50">
                  Added {formatPasskeyDate(passkey.created_at)}
                  {passkey.last_used_at
                    ? ` · Last used ${formatPasskeyDate(passkey.last_used_at)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-black/[0.10] bg-white text-[#0d0d0d]/55 outline-none transition hover:bg-black/[0.03] hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-60"
                onClick={() => void removePasskey(passkey.id)}
                disabled={removingId === passkey.id}
                aria-label="Remove passkey"
              >
                {removingId === passkey.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
