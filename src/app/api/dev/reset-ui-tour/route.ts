import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * One-shot dev helper to re-run the interface tour for a specific account.
 *
 * Safety:
 * - Returns 404 in production builds.
 * - Requires `ATLAS_DEV_LOGIN=1` (same guard as `/api/dev/login`).
 * - Only resets `hello@atlasai.ca` unless `?email=` is provided and matches
 *   `ATLAS_UI_TOUR_RESET_EMAIL` when that env var is set.
 *
 * Usage (local): open `/api/dev/reset-ui-tour` while signed in as the target
 * user, or pass `?email=hello@atlasai.ca` with the service role available.
 */
export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ATLAS_DEV_LOGIN !== "1"
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const email =
    searchParams.get("email") ??
    process.env.ATLAS_UI_TOUR_RESET_EMAIL ??
    "hello@atlasai.ca";

  const allowedEmail = process.env.ATLAS_UI_TOUR_RESET_EMAIL ?? "hello@atlasai.ca";
  if (email !== allowedEmail) {
    return NextResponse.json(
      { error: `Reset is only enabled for ${allowedEmail}.` },
      { status: 403 }
    );
  }

  try {
    const admin = createAdminClient();

    const { data: users, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const user = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      return NextResponse.json(
        { error: `No user found for ${email}.` },
        { status: 404 }
      );
    }

    const { error: updateError } = await admin
      .from("user_profiles")
      .update({ ui_tour_completed_at: null })
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const next = searchParams.get("next") ?? "/dashboard";
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reset failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
