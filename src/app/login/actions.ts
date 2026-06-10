"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AuthEmailLookup = {
  exists: boolean;
  hasPasskey: boolean;
};

/**
 * Looks up whether an email belongs to an existing account and whether that
 * account has enrolled passkeys. Used by the login/signup form to route the
 * user to passkey vs magic-link flows.
 *
 * Fails open on infra errors so sign-in is never blocked by a lookup hiccup.
 */
export async function lookupAuthEmail(email: string): Promise<AuthEmailLookup> {
  const trimmed = email.trim();
  if (!trimmed) return { exists: false, hasPasskey: false };

  try {
    const db = createAdminClient();
    const { data: userId, error } = await db.rpc("get_auth_user_id_by_email", {
      p_email: trimmed,
    });
    if (error) {
      console.error("get_auth_user_id_by_email rpc failed:", error);
      return { exists: false, hasPasskey: false };
    }
    if (!userId) return { exists: false, hasPasskey: false };

    const { data: passkeys, error: passkeyError } =
      await db.auth.admin.passkey.listPasskeys({ userId: userId as string });
    if (passkeyError) {
      console.error("listPasskeys failed:", passkeyError);
      return { exists: true, hasPasskey: false };
    }

    return { exists: true, hasPasskey: (passkeys?.length ?? 0) > 0 };
  } catch (err) {
    console.error("lookupAuthEmail error:", err);
    return { exists: false, hasPasskey: false };
  }
}
