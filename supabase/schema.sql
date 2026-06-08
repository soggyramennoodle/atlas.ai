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

-- Realtime: broadcast row changes on notes so the app reacts the instant a
-- lecture finishes processing (status processing -> ready/failed) instead of
-- relying on polling. RLS still applies — clients only receive changes for rows
-- they're allowed to select. Idempotent: skip if the table is already published.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;

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
  welcome_email_sent_at timestamptz,
  ui_tour_completed_at timestamptz,
  theme_preference text check (theme_preference is null or theme_preference in ('system', 'light', 'dark')),
  avatar_r2_key text,
  created_at   timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists welcome_email_sent_at timestamptz;

alter table public.user_profiles
  add column if not exists ui_tour_completed_at timestamptz;

alter table public.user_profiles
  add column if not exists theme_preference text
  check (theme_preference is null or theme_preference in ('system', 'light', 'dark'));

alter table public.user_profiles
  add column if not exists avatar_r2_key text;

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
-- user_feedback: reports about note quality or general product feedback.
-- ---------------------------------------------------------------------------
create table if not exists public.user_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  note_id         uuid references public.notes (id) on delete set null,
  category        text not null check (category in ('inaccurate', 'wrong', 'other')),
  message         text,
  page_path       text,
  status          text not null default 'unread'
    check (status in ('unread', 'read', 'resolved', 'dismissed')),
  reporter_email  text,
  admin_notes     text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists user_feedback_user_id_created_at_idx
  on public.user_feedback (user_id, created_at desc);

create index if not exists user_feedback_note_id_idx
  on public.user_feedback (note_id)
  where note_id is not null;

create index if not exists user_feedback_status_created_at_idx
  on public.user_feedback (status, created_at desc);

alter table public.user_feedback enable row level security;

drop policy if exists "Users insert own feedback" on public.user_feedback;
drop policy if exists "Users read own feedback"   on public.user_feedback;

create policy "Users insert own feedback"
  on public.user_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users read own feedback"
  on public.user_feedback for select
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

-- ---------------------------------------------------------------------------
-- newsroom_articles: the company "Newsroom" — announcements, product updates,
-- changelogs, notices, maintenance windows, security advisories and beta news.
--
-- Reads: anyone (including signed-out visitors) may read PUBLISHED articles.
-- Writes: there is no DB-level role system, so all create/update/delete go
-- through trusted server actions that (a) verify the signed-in user's email is
-- in the NEWSROOM_ADMIN_EMAILS allowlist and (b) use the service-role client,
-- which bypasses RLS. Deliberately NO insert/update/delete policy exists below,
-- so the anon/authenticated keys can never mutate this table directly.
-- ---------------------------------------------------------------------------
create table if not exists public.newsroom_articles (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique not null,
  excerpt         text not null,
  body            text not null,
  category        text not null,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'archived')),
  tags            text[] not null default '{}',
  version         text,
  severity        text check (severity in ('info', 'warning', 'critical')),
  featured        boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  author_user_id  uuid references auth.users (id) on delete set null
);

-- Public listing: published articles, newest first.
create index if not exists newsroom_published_at_idx
  on public.newsroom_articles (published_at desc)
  where status = 'published';

-- Admin listing scans every status by recency.
create index if not exists newsroom_status_updated_idx
  on public.newsroom_articles (status, updated_at desc);

-- Slug lookups for the detail page (unique constraint already indexes slug,
-- this is kept explicit for clarity / partial-published lookups).
create index if not exists newsroom_slug_idx
  on public.newsroom_articles (slug);

-- Keep updated_at honest on every write.
create or replace function public.touch_newsroom_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists newsroom_set_updated_at on public.newsroom_articles;
create trigger newsroom_set_updated_at
  before update on public.newsroom_articles
  for each row execute function public.touch_newsroom_updated_at();

alter table public.newsroom_articles enable row level security;

drop policy if exists "Anyone reads published articles" on public.newsroom_articles;

-- Read-only access to published articles for everyone. Drafts/archived rows are
-- invisible to the anon/authenticated keys; admins read them via service-role.
create policy "Anyone reads published articles"
  on public.newsroom_articles for select
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- Seed: a few realistic articles so the Newsroom looks alive on first load.
-- Idempotent on slug — safe to re-run. Delete or edit these from /admin/newsroom.
-- ---------------------------------------------------------------------------
insert into public.newsroom_articles
  (title, slug, excerpt, body, category, status, tags, version, severity, featured, published_at)
values
  (
    'Introducing Atlas: lecture recordings to structured notes',
    'introducing-atlas',
    'Atlas turns a recording of any lecture into thorough, structured study notes — automatically. Here''s what we built and where we''re headed.',
    E'Atlas listens to your lectures so you can stay present in them.\n\nRecord a class, upload the audio, and Atlas returns a clean set of structured notes: clear sections, key concepts with definitions, and a short summary you can review in minutes.\n\n## Why we built it\n\nTaking good notes while also *understanding* a lecture is genuinely hard. You either capture everything and absorb nothing, or you follow along and forget the details. Atlas removes that trade-off.\n\n## What you get today\n\n- **Structured notes** generated from your own recordings\n- **Key concepts** surfaced and defined automatically\n- **Editable rich-text** so you can refine anything\n- **Exports** to PDF and Word\n\nThis is just the beginning. Flashcards, quizzes, and active-recall tools are next.',
    'announcement',
    'published',
    array['launch', 'notes'],
    null,
    null,
    true,
    now() - interval '21 days'
  ),
  (
    'Rich-text editing for your notes',
    'rich-text-editing',
    'You can now edit generated notes in a full word-processor experience — and Atlas remembers your style for next time.',
    E'Generated notes are a starting point, not a cage. This release adds a proper rich-text editor to every note.\n\n## What changed\n\n- Edit headings, bullets and paragraphs inline\n- Bold, underline and lists with familiar shortcuts\n- Your edits are saved as you go\n\n> Atlas now learns from the way you rewrite notes, and applies that style to future lectures.\n\nOpen any note and start typing — there''s no "edit mode" to toggle.',
    'product_update',
    'published',
    array['editor', 'notes'],
    'v0.4.0',
    null,
    false,
    now() - interval '9 days'
  ),
  (
    'Changelog — June 2026',
    'changelog-june-2026',
    'Duplicate-job prevention, faster recorder animations, and a dark-first redesign land this month.',
    E'A roundup of everything that shipped this month.\n\n## Added\n\n- **Spatial Liquid Glass** redesign — a dark-first, indigo-violet visual language across the whole app\n- Handling for silent and stalled recordings so a bad upload fails fast instead of hanging\n\n## Fixed\n\n- Prevented duplicate note-generation jobs from the same recording\n- Optimized the recorder animation to stay smooth on lower-end devices\n\n## Notes\n\nNo action is required on your part — everything here is live.',
    'changelog',
    'published',
    array['changelog'],
    'v0.4.1',
    null,
    false,
    now() - interval '2 days'
  ),
  (
    'Scheduled maintenance: note generation',
    'scheduled-maintenance-june',
    'A short maintenance window may briefly pause new note generation. Existing notes stay available throughout.',
    E'We''ll be performing routine maintenance on our note-generation pipeline.\n\nDuring the window, **starting a new recording may be temporarily unavailable**. Any notes already in your library remain fully accessible, and in-flight jobs will resume automatically once maintenance completes.\n\nWe expect minimal disruption and will update this notice if anything changes.',
    'maintenance',
    'published',
    array['status'],
    null,
    'warning',
    false,
    now() - interval '5 hours'
  )
on conflict (slug) do nothing;
