"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { browserSupportsPasskeys } from "@/lib/passkeys";
import { Button } from "@/components/ui/button";

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
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supported) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.passkey.list();
    if (error) {
      console.error("Passkey list failed:", error);
      toast.error("Couldn't load your passkeys.");
      setLoading(false);
      return;
    }
    setPasskeys((data as PasskeyRow[] | null) ?? []);
    setLoading(false);
  }, [supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    <div className="rounded-[4px] border border-border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold tracking-tight">Passkeys</h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Sign in with Face ID, Touch ID, or your device PIN instead of
            waiting on a magic link.
          </p>
        </div>
        {supported && (
          <Button
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => void addPasskey()}
            disabled={adding || loading}
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            Add passkey
          </Button>
        )}
      </div>

      {!supported ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your browser doesn&apos;t support passkeys on this device.
        </p>
      ) : loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading passkeys…
        </div>
      ) : passkeys.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No passkeys saved yet. Add one to sign in faster next time.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border rounded-[4px] border border-border">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {passkey.friendly_name?.trim() || "Passkey"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Added {formatPasskeyDate(passkey.created_at)}
                  {passkey.last_used_at
                    ? ` · Last used ${formatPasskeyDate(passkey.last_used_at)}`
                    : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => void removePasskey(passkey.id)}
                disabled={removingId === passkey.id}
                aria-label="Remove passkey"
              >
                {removingId === passkey.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
