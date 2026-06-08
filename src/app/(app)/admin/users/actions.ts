"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { isNewsroomAdmin } from "@/lib/newsroom";
import { getR2Bucket, r2 } from "@/lib/r2";
import { ATLAS_SITE_URL } from "@/lib/atlas-brand";

// GoTrue treats a far-future ban as an indefinite suspension; "none" clears it.
const BAN_DURATION = "876000h"; // ~100 years

type ActionResult = { ok: boolean; error?: string };

function revalidateUsers() {
  revalidatePath("/admin/users");
}

async function requireAdmin() {
  const admin = await getNewsroomAdmin();
  if (!admin) return { ok: false as const, error: "Forbidden." };
  return { ok: true as const, admin };
}

/**
 * Guards a destructive action against a target user: rejects acting on
 * yourself or on any other admin (so no one can lock the team out or nuke an
 * operator account by accident). Returns the target's email on success.
 */
async function requireSafeTarget(
  callerId: string,
  targetId: string
): Promise<{ ok: true; email: string | null } | { ok: false; error: string }> {
  if (callerId === targetId) {
    return { ok: false, error: "You can't do that to your own account." };
  }
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.getUserById(targetId);
  if (error || !data?.user) {
    return { ok: false, error: "User not found." };
  }
  if (isNewsroomAdmin(data.user.email)) {
    return { ok: false, error: "That user is an admin and is protected." };
  }
  return { ok: true, email: data.user.email ?? null };
}

/**
 * Emails the user a fresh magic sign-in link via the same passwordless path the
 * login form uses. Uses a throwaway anon client (no session, no cookies) so it
 * only triggers Supabase's email send and never touches the admin's session.
 * Allowed for any user — it just delivers a sign-in link to their own inbox.
 */
export async function resendMagicLink(email: string): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "Missing email." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, error: "Auth is not configured." };
  }

  const anon = createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await anon.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${ATLAS_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("Resend magic link failed:", error);
    return { ok: false, error: "Couldn't send the link. Try again." };
  }

  return { ok: true };
}

/** Bans (suspends) or unbans a user. Protected targets are rejected. */
export async function setUserBanned(
  id: string,
  banned: boolean
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const safe = await requireSafeTarget(gate.admin.id, id);
  if (!safe.ok) return safe;

  const db = createAdminClient();
  const { error } = await db.auth.admin.updateUserById(id, {
    ban_duration: banned ? BAN_DURATION : "none",
  });

  if (error) {
    console.error("Ban toggle failed:", error);
    return { ok: false, error: "Couldn't update the user." };
  }

  revalidateUsers();
  return { ok: true };
}

/**
 * Permanently deletes a user and purges their data. Storage (Cloudflare R2)
 * isn't covered by the DB's FK cascade, and deleting the auth user wipes the
 * rows that hold the R2 keys — so we gather and delete R2 objects FIRST, then
 * delete the auth user (which cascades notes, jobs, segments, profiles, memory
 * and feedback).
 *
 * The caller must pass the user's exact email as a typed confirmation.
 */
export async function deleteUserAccount(
  id: string,
  confirmEmail: string
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const safe = await requireSafeTarget(gate.admin.id, id);
  if (!safe.ok) return safe;

  if (
    !safe.email ||
    confirmEmail.trim().toLowerCase() !== safe.email.toLowerCase()
  ) {
    return { ok: false, error: "Confirmation email didn't match." };
  }

  const db = createAdminClient();

  // 1. Gather R2 keys before the cascade removes the rows that hold them.
  const keys = await collectUserR2Keys(db, id);

  // 2. Best-effort delete the objects; orphaned objects shouldn't block account
  //    removal.
  await Promise.all(
    keys.map((key) =>
      r2
        .send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }))
        .catch(() => {})
    )
  );

  // 3. Delete the auth user — DB rows cascade from here.
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) {
    console.error("Delete user failed:", error);
    return { ok: false, error: "Couldn't delete the account." };
  }

  revalidateUsers();
  return { ok: true };
}

/** All R2 object keys a user owns: lecture segments + direct note audio. */
async function collectUserR2Keys(
  db: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string[]> {
  const keys = new Set<string>();

  // Segment objects, via the user's jobs.
  const { data: jobs } = await db
    .from("lecture_jobs")
    .select("id")
    .eq("user_id", userId);
  const jobIds = ((jobs ?? []) as { id: string }[]).map((j) => j.id);

  if (jobIds.length > 0) {
    const { data: segments } = await db
      .from("lecture_segments")
      .select("r2_key")
      .in("job_id", jobIds);
    for (const seg of (segments ?? []) as { r2_key: string | null }[]) {
      if (seg.r2_key) keys.add(seg.r2_key);
    }
  }

  // Direct note audio: `audio_path` is an R2 key when it contains "/", else a
  // job-id reference (already covered by segments above).
  const { data: notes } = await db
    .from("notes")
    .select("audio_path")
    .eq("user_id", userId);
  for (const note of (notes ?? []) as { audio_path: string | null }[]) {
    if (note.audio_path && note.audio_path.includes("/")) keys.add(note.audio_path);
  }

  return [...keys];
}
