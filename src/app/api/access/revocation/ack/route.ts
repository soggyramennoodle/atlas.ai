import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { forceRemoteSignOut } from "@/lib/access-revocations";

export const runtime = "nodejs";

/** User acknowledged the locked overlay — complete the revocation and sign out. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: pending } = await db
    .from("access_revocations")
    .select("id, kind")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!pending) {
    return NextResponse.json({ error: "Nothing to acknowledge." }, { status: 404 });
  }

  // One-time maintenance logouts clear the queue; bans stay active so the user
  // cannot sign back in until an admin unbans them.
  if (pending.kind !== "banned") {
    await db
      .from("access_revocations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", pending.id);
  }

  await forceRemoteSignOut(user.id);
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
