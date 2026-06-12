import { NextResponse } from "next/server";
import { safeAuthNextPath } from "@/lib/auth-errors";
import { isAccountBannedByUserId } from "@/lib/account-ban-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes admin-issued magic links. The token is verified server-side so we
 * don't depend on a PKCE code exchange in /auth/callback.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeAuthNextPath(searchParams.get("next"));

  if (!tokenHash || type !== "magiclink") {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

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

  console.error("Magic link confirm failed:", error);
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
