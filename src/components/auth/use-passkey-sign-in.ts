"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

export function usePasskeySignIn(next: string) {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  const signIn = useCallback(async () => {
    setSigningIn(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error) {
        if (error.name === "WebAuthnUnknownError") {
          toast.error("Passkey sign-in was cancelled.");
          return;
        }
        toast.error(authErrorMessage(error, "Couldn't sign in with passkey."));
        return;
      }
      if (data.session) {
        const res = await fetch("/api/access/revocation", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as {
            revocation: { kind: string } | null;
          };
          if (json.revocation?.kind === "banned") {
            await supabase.auth.signOut();
            router.replace("/login?locked=1");
            router.refresh();
            return;
          }
        }
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't sign in with passkey."
      );
    } finally {
      setSigningIn(false);
    }
  }, [next, router]);

  return { signIn, signingIn };
}
