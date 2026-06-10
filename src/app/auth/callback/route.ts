import { NextResponse } from "next/server";
import { safeAuthNextPath } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles OAuth and self-initiated magic links (PKCE `code` exchange).
 * Admin-issued links use `/auth/confirm` instead.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
