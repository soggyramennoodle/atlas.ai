import { ATLAS_SITE_URL } from "@/lib/atlas-brand";

/** Post-auth redirect target passed through `/auth/callback`. */
export function magicLinkRedirectTo(next = "/dashboard"): string {
  const path = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return `${ATLAS_SITE_URL}/auth/callback?next=${encodeURIComponent(path)}`;
}

/**
 * Build the same Supabase verify URL the send-email hook puts in Loops emails.
 * Admin-generated links must match this shape or the callback won't exchange.
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
