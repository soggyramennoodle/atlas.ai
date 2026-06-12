import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessRevocationGrace, AccessRevocationKind } from "@/lib/types";

const ACTIVE_JOB_STATUSES = ["recording", "recording_complete", "processing"] as const;

/** Decide how long to wait before surfacing a forced sign-out popup. */
export async function determineLogoutGrace(
  userId: string
): Promise<AccessRevocationGrace> {
  const db = createAdminClient();
  const { data: job } = await db
    .from("lecture_jobs")
    .select("status")
    .eq("user_id", userId)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) return "immediate";
  if (job.status === "recording") return "after_recording";
  if (job.status === "recording_complete") return "after_upload";
  return "immediate";
}

/** Invalidate every refresh token for a user who is not mid-capture. */
export async function forceRemoteSignOut(userId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  try {
    await fetch(`${url}/auth/v1/admin/users/${userId}/logout?scope=global`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
  } catch (err) {
    console.error("Remote sign-out failed:", userId, err);
  }
}

/** Queue a forced sign-out. Replaces any existing pending row for the user. */
export async function queueAccessRevocation(
  userId: string,
  kind: AccessRevocationKind,
  grace?: AccessRevocationGrace
): Promise<void> {
  const db = createAdminClient();
  const resolvedGrace = grace ?? (await determineLogoutGrace(userId));

  await db
    .from("access_revocations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "pending");

  const { error } = await db.from("access_revocations").insert({
    user_id: userId,
    kind,
    grace: resolvedGrace,
    status: "pending",
  });

  if (error) {
    console.error("queueAccessRevocation failed:", error);
    throw error;
  }

  // Bans surface the in-app lock overlay first; sessions are ended when the
  // user acknowledges. Maintenance logouts still revoke tokens immediately.
  if (resolvedGrace === "immediate" && kind !== "banned") {
    await forceRemoteSignOut(userId);
  }
}

/** Clear a pending revocation (e.g. when an admin unbans someone). */
export async function clearPendingRevocation(userId: string): Promise<void> {
  const db = createAdminClient();
  await db
    .from("access_revocations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "pending");
}
