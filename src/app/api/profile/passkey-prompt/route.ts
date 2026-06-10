import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Record that the user dismissed the one-time passkey enrollment prompt. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      passkey_prompt_dismissed_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Passkey prompt dismiss failed:", error);
    return NextResponse.json(
      { error: "Couldn't save your preference." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
