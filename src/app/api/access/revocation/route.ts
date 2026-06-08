import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AccessRevocation } from "@/lib/types";

export const runtime = "nodejs";

/** Return the signed-in user's pending access revocation, if any. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("access_revocations")
    .select("id, user_id, kind, grace, status, created_at, completed_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    console.error("Revocation lookup failed:", error);
    return NextResponse.json(
      { error: "Couldn't check account status." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    revocation: (data as AccessRevocation | null) ?? null,
  });
}
