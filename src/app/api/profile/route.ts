import { NextResponse } from "next/server";
import {
  LOOPS_WELCOME_TRANSACTIONAL_ID,
  sendLoopsEmail,
} from "@/lib/loops";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FIELDS = [
  "display_name",
  "institution",
  "program",
  "year",
  "grad_year",
] as const;

/** Create or update the current user's profile (§5). Used by onboarding and
 * the Settings profile form. RLS scopes the upsert to the signed-in user. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const row: Record<string, unknown> = { user_id: user.id };
  for (const f of FIELDS) {
    if (f in body) {
      const v = body[f];
      row[f] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("user_profiles")
    .select("welcome_email_sent_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    console.error("Profile lookup failed:", existingProfileError);
    return NextResponse.json(
      { error: "Couldn't save your profile." },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("Profile upsert failed:", error);
    return NextResponse.json(
      { error: "Couldn't save your profile." },
      { status: 500 }
    );
  }

  const displayName =
    typeof row.display_name === "string" ? row.display_name : undefined;

  if (user.email && displayName && !existingProfile?.welcome_email_sent_at) {
    try {
      await sendLoopsEmail({
        transactionalId: LOOPS_WELCOME_TRANSACTIONAL_ID,
        email: user.email,
        idempotencyKey: `welcome-${user.id}`,
      });

      const { error: markSentError } = await supabase
        .from("user_profiles")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (markSentError) {
        console.error("Couldn't mark welcome email as sent:", markSentError);
      }
    } catch (err) {
      console.error("Welcome email send failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
