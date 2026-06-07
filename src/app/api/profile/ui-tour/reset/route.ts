import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RESET_EMAIL = "hello@atlasai.ca";

/**
 * One-time production helper: clears the interface tour for hello@atlasai.ca so
 * the spotlight walkthrough can be replayed. Gated to that account only.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.email.toLowerCase() !== RESET_EMAIL) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ ui_tour_completed_at: null })
    .eq("user_id", user.id);

  if (error) {
    console.error("UI tour reset failed:", error);
    return NextResponse.json(
      { error: "Couldn't reset tour progress." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, replay: true });
}
