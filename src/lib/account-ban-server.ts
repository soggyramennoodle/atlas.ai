import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBannedUntil } from "@/lib/admin-users";

/** Whether a user has a pending in-app ban revocation. */
export async function hasPendingBanRevocation(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("access_revocations")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .eq("kind", "banned")
    .maybeSingle();

  if (error) {
    console.error("Pending ban lookup failed:", error);
    return false;
  }

  return Boolean(data);
}

/** Service-role ban check by user id (revocation queue + legacy GoTrue ban). */
export async function isAccountBannedByUserId(userId: string): Promise<boolean> {
  const db = createAdminClient();

  const { data: pending } = await db
    .from("access_revocations")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .eq("kind", "banned")
    .maybeSingle();
  if (pending) return true;

  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error) {
    console.error("getUserById failed during ban check:", error);
    return false;
  }

  return isBannedUntil(
    (data.user as { banned_until?: string | null }).banned_until
  );
}

/** Service-role ban check by email (revocation queue + legacy GoTrue ban). */
export async function isAccountBannedByEmail(email: string): Promise<boolean> {
  const trimmed = email.trim();
  if (!trimmed) return false;

  const db = createAdminClient();
  const { data: banned, error } = await db.rpc("is_account_banned", {
    p_email: trimmed,
  });
  if (error) {
    console.error("is_account_banned rpc failed:", error);
    return false;
  }

  return Boolean(banned);
}
