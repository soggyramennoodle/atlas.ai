/** User-facing copy when Supabase Auth throttles OTP / magic-link sends. */
export const AUTH_EMAIL_RATE_LIMIT_MESSAGE =
  "Too many sign-in emails were sent recently. Wait about an hour before trying again, or sign in with Google if your account has it linked.";

export function isAuthEmailRateLimitError(
  error: { code?: string; message?: string; status?: number } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === "over_email_send_rate_limit") return true;
  if (error.status === 429) return true;
  return /email rate limit exceeded/i.test(error.message ?? "");
}

export function authErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
  fallback = "Couldn't send the link. Try again."
): string {
  if (isAuthEmailRateLimitError(error)) return AUTH_EMAIL_RATE_LIMIT_MESSAGE;
  return error?.message?.trim() || fallback;
}
