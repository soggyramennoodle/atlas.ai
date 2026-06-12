import { NextResponse } from "next/server";
import { safeAuthNextPath } from "@/lib/auth-errors";
import { isAccountBannedByUserId } from "@/lib/account-ban-server";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && (await isAccountBannedByUserId(user.id))) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?locked=1`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
