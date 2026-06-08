/**
 * Pure, client-safe helpers for the admin Users page. No server-only imports
 * here so the logic can be unit-tested and shared with Client Components.
 *
 * The server layer (`admin-users-server.ts`) builds `AdminUserRow` objects from
 * Supabase `auth.admin.listUsers()` results plus per-user data counts, then
 * hands these plain, serializable rows to the client table.
 */

/** A user as shown in the admin table — only auth identity + lifecycle, no profile content. */
export interface AdminUserRow {
  id: string;
  email: string | null;
  /** Raw provider keys, e.g. ["email"], ["google"], ["email","google"]. */
  methods: string[];
  /** Human label derived from `methods`, e.g. "Email (magic link)", "Google". */
  methodLabel: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  banned: boolean;
  isAdmin: boolean;
  notesCount: number;
  recordingsCount: number;
}

const METHOD_LABELS: Record<string, string> = {
  email: "Email (magic link)",
  google: "Google",
  apple: "Apple",
};

/**
 * Collect the distinct sign-in provider keys for a user. Prefers the richer
 * `identities` list (one entry per linked provider) and falls back to
 * `app_metadata.providers` / `app_metadata.provider`.
 */
export function deriveMethods(
  identities: { provider?: string | null }[] | null | undefined,
  appMetadata: { provider?: string | null; providers?: string[] | null } | null | undefined
): string[] {
  const set = new Set<string>();
  for (const identity of identities ?? []) {
    if (identity?.provider) set.add(identity.provider);
  }
  if (set.size === 0) {
    for (const provider of appMetadata?.providers ?? []) {
      if (provider) set.add(provider);
    }
    if (appMetadata?.provider) set.add(appMetadata.provider);
  }
  return [...set];
}

/** Turn provider keys into a readable label, e.g. "Email (magic link) + Google". */
export function methodLabel(methods: string[]): string {
  if (methods.length === 0) return "Unknown";
  return methods.map((m) => METHOD_LABELS[m] ?? m).join(" + ");
}

/** Whether a `banned_until` timestamp puts the user in an active ban right now. */
export function isBannedUntil(
  bannedUntil: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!bannedUntil) return false;
  const until = Date.parse(bannedUntil);
  if (Number.isNaN(until)) return false;
  return until > now;
}

/** Compact date for the table, e.g. "Jun 3, 2026". Falls back to "—". */
export function formatUserDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Tally how many rows each user owns. Input is the flat list of `{ user_id }`
 * rows from a bulk `.in("user_id", ids)` query; output maps id → count.
 */
export function tallyByUserId(rows: { user_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}
