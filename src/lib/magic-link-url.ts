import { ATLAS_SITE_URL } from "@/lib/atlas-brand";

/** Post-auth redirect target passed through `/auth/callback`. */
export function magicLinkRedirectTo(next = "/dashboard"): string {
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return `${ATLAS_SITE_URL}/auth/callback?next=${encodeURIComponent(path)}`;
}

/**
 * Admin magic links must land on our server confirm route. Links that bounce
 * through Supabase /verify expect a PKCE verifier in the browser, which only
 * exists for self-initiated signInWithOtp — not admin generateLink emails.
 */
export function buildAdminMagicLinkUrl(
  tokenHash: string,
  next = "/dashboard"
): string {
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const url = new URL("/auth/confirm", ATLAS_SITE_URL);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("next", path);
  return url.toString();
}

/**
 * Build the Supabase verify URL for self-initiated OTP emails (send-email hook).
 * Those flows store a PKCE verifier client-side before the email is sent.
 */
export function buildMagicLinkConfirmationUrl(
  tokenHash: string,
  redirectTo: string = magicLinkRedirectTo()
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}
