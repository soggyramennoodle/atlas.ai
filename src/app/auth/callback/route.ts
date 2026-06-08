import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect back from Supabase after email confirmation or OAuth,
 * exchanging the `code` for a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow same-origin relative paths in `next` to prevent open redirects
  // (reject absolute URLs and protocol-relative `//host` values).
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // A banned user can still complete Google OAuth (or click an old magic
    // link) and arrive here with a valid code — the ban is enforced now, at the
    // session exchange. Send them to the dedicated "account locked" screen
    // instead of the generic error toast.
    if (isBannedError(error)) {
      return NextResponse.redirect(`${origin}/login?locked=1`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

/** Whether an auth error is GoTrue's "user is banned" rejection. */
function isBannedError(error: { code?: string; message?: string }): boolean {
  if (error.code === "user_banned") return true;
  return /banned/i.test(error.message ?? "");
}
