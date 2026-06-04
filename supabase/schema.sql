-- ===========================================================================
-- Atlas — database schema & security policies
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- notes: one row per generated set of lecture notes, owned by a user.
-- `content` holds the StructuredNotes JSON returned by Gemini.
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  subject          text,
  content          jsonb not null,
  audio_path       text,
  duration_seconds integer,
  created_at       timestamptz not null default now()
);

create index if not exists notes_user_id_created_at_idx
  on public.notes (user_id, created_at desc);

-- Idempotency key for note generation. The app keeps `audio_path` after raw
-- audio deletion as a non-sensitive job key, so reloads/retries cannot start
-- duplicate paid generation for the same uploaded recording.
create unique index if not exists notes_user_id_audio_path_key
  on public.notes (user_id, audio_path)
  where audio_path is not null;

-- Row Level Security: a user can only ever see/touch their own notes.
alter table public.notes enable row level security;

drop policy if exists "Users read own notes"   on public.notes;
drop policy if exists "Users insert own notes"  on public.notes;
drop policy if exists "Users update own notes"  on public.notes;
drop policy if exists "Users delete own notes"  on public.notes;

create policy "Users read own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "Users insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "Users update own notes"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "Users delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for the uploaded lecture audio.
-- Private bucket; each user can only access files under their own user-id
-- folder, e.g.  <user_id>/<uuid>.m4a
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('lectures', 'lectures', false)
on conflict (id) do nothing;

drop policy if exists "Users read own lecture audio"   on storage.objects;
drop policy if exists "Users upload own lecture audio"  on storage.objects;
drop policy if exists "Users delete own lecture audio"  on storage.objects;

create policy "Users read own lecture audio"
  on storage.objects for select
  using (
    bucket_id = 'lectures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users upload own lecture audio"
  on storage.objects for insert
  with check (
    bucket_id = 'lectures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own lecture audio"
  on storage.objects for delete
  using (
    bucket_id = 'lectures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Optional: raise the per-file size limit for the bucket (default is small).
-- Adjust to your plan's maximum. 100 MB shown here:
update storage.buckets
  set file_size_limit = 104857600
  where id = 'lectures';

-- ---------------------------------------------------------------------------
-- user_profiles: one row per user, captured during onboarding and editable in
-- Settings. Drives the dashboard greeting and personalizes note generation.
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  institution  text,
  program      text,
  year         text,
  grad_year    text,
  created_at   timestamptz not null default now()
);

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
