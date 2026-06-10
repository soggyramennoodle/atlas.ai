/** Shared Supabase auth options for experimental passkey support. */
export const SUPABASE_PASSKEY_AUTH_OPTIONS = {
  auth: {
    experimental: { passkey: true as const },
  },
} as const;

/** Whether this browser can run a platform passkey ceremony. */
export function browserSupportsPasskeys(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof PublicKeyCredential !== "undefined" &&
    typeof PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}
