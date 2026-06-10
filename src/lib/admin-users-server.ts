import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isNewsroomAdmin } from "@/lib/newsroom";
import {
  type AdminUserRow,
  deriveMethods,
  isBannedUntil,
  methodLabel,
  tallyByUserId,
} from "@/lib/admin-users";

const PER_PAGE = 1000;
const MAX_USERS = 5000;

interface ListUsersResult {
  rows: AdminUserRow[];
  /** True if we hit MAX_USERS and stopped paging — the table shows a notice. */
  truncated: boolean;
}

/**
 * Loads every auth user (paged), enriches each with its sign-in method, ban /
 * confirmation / admin flags, and notes / recordings counts. SERVICE ROLE —
 * server only. Counts are gathered in exactly two bulk queries (not per-user)
 * to avoid N+1.
 */
export async function listAdminUsers(): Promise<ListUsersResult> {
  const db = createAdminClient();

  const users: User[] = [];
  let truncated = false;

  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;

    users.push(...data.users);

    if (users.length >= MAX_USERS) {
      truncated = true;
      users.length = MAX_USERS;
      break;
    }
    if (data.users.length < PER_PAGE) break;
  }

  const ids = users.map((u) => u.id);
  const [notesCounts, recordingsCounts, pendingBanIds] = await Promise.all([
    countByUser(db, "notes", ids),
    countByUser(db, "lecture_jobs", ids),
    loadPendingBanUserIds(db, ids),
  ]);

  const rows: AdminUserRow[] = users.map((u) => {
    const methods = deriveMethods(u.identities ?? null, u.app_metadata ?? null);
    return {
      id: u.id,
      email: u.email ?? null,
      methods,
      methodLabel: methodLabel(methods),
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      emailConfirmed: Boolean(u.email_confirmed_at),
      banned:
        isBannedUntil((u as { banned_until?: string | null }).banned_until) ||
        pendingBanIds.has(u.id),
      isAdmin: isNewsroomAdmin(u.email),
      notesCount: notesCounts.get(u.id) ?? 0,
      recordingsCount: recordingsCounts.get(u.id) ?? 0,
    };
  });

  // Newest accounts first.
  rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return { rows, truncated };
}

/** Users with a pending in-app ban revocation (revocation-only ban model). */
async function loadPendingBanUserIds(
  db: ReturnType<typeof createAdminClient>,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await db
    .from("access_revocations")
    .select("user_id")
    .in("user_id", ids)
    .eq("status", "pending")
    .eq("kind", "banned");
  if (error) {
    console.error("Failed to load pending ban revocations:", error);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.user_id as string));
}

/** Tally rows of a table that has a `user_id` column, scoped to the given ids. */
async function countByUser(
  db: ReturnType<typeof createAdminClient>,
  table: "notes" | "lecture_jobs",
  ids: string[]
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db.from(table).select("user_id").in("user_id", ids);
  if (error) {
    console.error(`Failed to count ${table} per user:`, error);
    return new Map();
  }
  return tallyByUserId((data ?? []) as { user_id: string }[]);
}
