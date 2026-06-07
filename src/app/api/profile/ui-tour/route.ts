import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Mark the signed-in user's interface tour as completed. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ ui_tour_completed_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.error("UI tour completion failed:", error);
    return NextResponse.json(
      { error: "Couldn't save tour progress." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
