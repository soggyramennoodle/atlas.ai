-- ---------------------------------------------------------------------------
-- System incident flags (e.g. Gemini monthly spend cap reached). One active
-- row per type at a time. Apply in the Supabase SQL editor; safe to re-run.
-- ---------------------------------------------------------------------------
create table if not exists public.system_alerts (
  id                uuid primary key default gen_random_uuid(),
  type              text not null,
  active            boolean not null default true,
  first_detected_at timestamptz not null default now(),
  last_detected_at  timestamptz not null default now(),
  notification_sent boolean not null default false,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- Enforce at most one active alert per type (the worker relies on this for
-- idempotent open-on-conflict).
create unique index if not exists system_alerts_active_type_idx
  on public.system_alerts (type)
  where active;

-- All access is via the service-role client (worker + admin route handlers),
-- which bypasses RLS. Enable RLS with no policies so nothing is reachable from
-- the browser anon/auth role.
alter table public.system_alerts enable row level security;
