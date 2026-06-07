const INVALIDATE_KEY = "atlas:dashboard:invalidate";

/** Mark dashboard data stale before navigating there (e.g. after delete or upload). */
export function markDashboardStale(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(INVALIDATE_KEY, "1");
}

/** Returns true once if a stale flag was set; clears the flag. */
export function consumeDashboardStale(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const flagged = sessionStorage.getItem(INVALIDATE_KEY) === "1";
  if (flagged) sessionStorage.removeItem(INVALIDATE_KEY);
  return flagged;
}
