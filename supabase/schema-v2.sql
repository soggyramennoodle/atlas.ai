-- ===========================================================================
-- Atlas — schema v2 (AI memory + user profiles)
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Safe to run more than once (idempotent).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- user_profiles: one row per user, captured during onboarding and editable
-- in Settings. Drives the dashboard greeting and personalizes note generation.
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  institution  text,
  program      text,
  year         text,
  grad_year    text,
  welcome_email_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists welcome_email_sent_at timestamptz;

alter table public.user_profiles enable row level security;

drop policy if exists "Users read own profile"   on public.user_profiles;
drop policy if exists "Users insert own profile"  on public.user_profiles;
drop policy if exists "Users update own profile"  on public.user_profiles;

create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_memory: one row per user. `memory_blob` is a JSONB document Atlas
-- accumulates over time (preferred terminology, subjects, recurring courses,
-- corrections from edits, inferred style) and injects into note generation.
-- ---------------------------------------------------------------------------
create table if not exists public.user_memory (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  memory_blob jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.user_memory enable row level security;

drop policy if exists "Users read own memory"   on public.user_memory;
drop policy if exists "Users insert own memory"  on public.user_memory;
drop policy if exists "Users update own memory"  on public.user_memory;

create policy "Users read own memory"
  on public.user_memory for select
  using (auth.uid() = user_id);

create policy "Users insert own memory"
  on public.user_memory for insert
  with check (auth.uid() = user_id);

create policy "Users update own memory"
  on public.user_memory for update
  using (auth.uid() = user_id);
