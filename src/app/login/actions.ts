"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns whether the given email belongs to a currently-banned account, so the
 * login form can show the "account locked" screen instead of sending a magic
 * link.
 *
 * Fails OPEN: if the lookup errors (e.g. the `is_account_banned` SQL function
 * hasn't been applied yet) we return `{ locked: false }` so legitimate sign-ins
 * are never blocked by an infra hiccup. Banned users are still stopped at the
 * auth callback regardless — this check is purely to improve the UX message.
 */
export async function checkAccountLocked(
  email: string
): Promise<{ locked: boolean }> {
  const trimmed = email.trim();
  if (!trimmed) return { locked: false };

  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc("is_account_banned", {
      p_email: trimmed,
    });
    if (error) {
      console.error("is_account_banned rpc failed:", error);
      return { locked: false };
    }
    return { locked: Boolean(data) };
  } catch (err) {
    console.error("checkAccountLocked error:", err);
    return { locked: false };
  }
}
