# Admin → Users management page

**Date:** 2026-06-07
**Status:** Approved design, pending implementation

## Goal

Give admins a `/admin/users` page to inspect every signed-up account and run
support/troubleshooting actions against it — without exposing names or other
profile content. The page focuses on auth identity and account lifecycle.

## Context

- Auth is **Supabase**, passwordless. Two sign-up methods only: **email magic
  link** (`signInWithOtp`) and **Google OAuth** (`signInWithOAuth`). There are
  no passwords, so password reset is out of scope.
- Admin gating is `getNewsroomAdmin()` (email in `NEWSROOM_ADMIN_EMAILS`).
  Admin pages call `notFound()` for non-admins to hide the area's existence.
- The service-role client (`createAdminClient()`, `src/lib/supabase/admin.ts`)
  is available server-side for `auth.admin.*` calls.
- File storage is **Cloudflare R2** (not Supabase Storage). R2 keys live in
  `lecture_segments.r2_key`, and `notes.audio_path` holds either a direct R2
  key (contains `/`) or a job-id reference (no `/`). Existing R2 deletion
  patterns: `src/app/(app)/notes/[id]/actions.ts` and `src/lib/jobs-cleanup.ts`.
- Tables with `ON DELETE CASCADE` to `auth.users(id)`: `notes`, `lecture_jobs`
  (and `lecture_segments` cascade from `lecture_jobs`), `user_profiles`,
  `user_memory`, `user_feedback`. `newsroom_articles.author_user_id` is
  `ON DELETE SET NULL`.

## Page & gating

- New route `src/app/(app)/admin/users/page.tsx`, mirroring
  `src/app/(app)/admin/feedback/page.tsx`: server component, `getNewsroomAdmin()`
  → `notFound()` if not admin, `export const dynamic = "force-dynamic"`.
- Add a "Users" card to the admin hub (`src/app/(app)/admin/page.tsx`) using a
  `Users` lucide icon.
- Every server action re-checks admin via a local `requireAdmin()` helper
  (same shape as `src/app/(app)/admin/feedback/actions.ts`).

## Data displayed (per user)

- **Email**
- **User ID** — with copy-to-clipboard
- **Sign-up method** — derived from `identities` / `app_metadata.providers`:
  `"Email (magic link)"`, `"Google"`, or both if multiple identities.
- **Created** date and **Last sign-in** date
- Badges: **email confirmed** (`email_confirmed_at`), **banned**
  (`banned_until` in the future), **admin** (email in `NEWSROOM_ADMIN_EMAILS`).
- **Notes count** and **Recordings count** (`lecture_jobs`), fetched in two
  bulk queries with `.in("user_id", pageUserIds)` and tallied in JS — no N+1.

## Data loading

- `src/lib/admin-users-server.ts`:
  - `listAllAuthUsers()` — loops `auth.admin.listUsers({ page, perPage: 1000 })`
    until exhausted, with a hard cap (e.g. 5000) and a `truncated` flag.
  - Aggregation helper that returns notes/recordings counts keyed by user id.
  - Derivation helpers for method label and admin flag.
- Search is client-side over email / user ID (all users loaded once). Scale is
  small; this keeps it snappy. If `truncated`, show a notice.

## Actions

All in `src/app/(app)/admin/users/actions.ts`, each returns
`{ ok: boolean; error?: string }` and re-checks admin first. After mutations,
`revalidatePath("/admin/users")`.

1. **Resend magic link** (`resendMagicLink(email)`) — confirm dialog first
   ("Email a sign-in link to <email>?"). Sends via an anon server client
   `signInWithOtp({ email, options: { shouldCreateUser: false,
   emailRedirectTo: <origin>/auth/callback } })` — the same delivery path as the
   login form. Allowed for all users (including admins). Not blocked by ban
   self-protection.

2. **Ban / Unban toggle** (`setUserBanned(id, banned)`) —
   `auth.admin.updateUserById(id, { ban_duration: banned ? "876000h" : "none" })`.
   Disabled for the current admin's own row and for any admin row.

3. **Delete account — full purge** (`deleteUserAccount(id)`) — confirm requires
   typing the user's exact email. Order (FK cascade would wipe rows we need, so
   gather keys first):
   1. Gather R2 keys: all `lecture_segments.r2_key` for the user's
      `lecture_jobs`, plus `notes.audio_path` values that contain `/`.
   2. Best-effort delete those R2 objects (`DeleteObjectCommand`, `.catch(() => {})`).
   3. `auth.admin.deleteUser(id)` → cascades DB rows.
   Disabled for the current admin's own row and for any admin row.

## Self-protection

The signed-in admin's row and any other admin row have **Ban** and **Delete**
disabled in the UI, and the server actions reject those targets (verify target
email is not in `NEWSROOM_ADMIN_EMAILS`, and target id ≠ caller id). Resend
magic link stays allowed.

## Components

- `src/components/admin/user-list.tsx` — client component: search box, results
  count, truncation notice, renders rows.
- `src/components/admin/user-row.tsx` — client component: row display, copy id,
  action buttons, confirm dialogs (reuse existing dialog/`AlertDialog` and
  `sonner` toasts as used elsewhere in admin components).

## Out of scope / non-goals

- No display or editing of profile content (names, memory, note bodies).
- No schema changes, no new env vars, no new dependencies.
- No password reset (passwordless auth).
- No bulk actions; one user at a time.

## Testing

- Unit-test pure helpers in `admin-users-server.ts`: method-label derivation
  from identities/providers, admin-flag derivation, banned-state derivation
  from `banned_until`, and count aggregation tallying. (Follows existing
  `*.test.ts` vitest pattern, e.g. `src/lib/jobs.test.ts`.)
- Manual verification: load page as admin, confirm gating hides it for
  non-admins, exercise each action against a throwaway test account.
