-- ---------------------------------------------------------------------------
-- Durable lecture-processing jobs. One job per recording; segments are the
-- ~5-minute audio slices that the worker transcribes one at a time.
--
-- Apply this in the Supabase SQL Editor. Safe to re-run (idempotent).
-- ---------------------------------------------------------------------------
create table if not exists public.lecture_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  note_id         uuid references public.notes (id) on delete cascade,
  status          text not null default 'recording',
  segment_count   integer,
  total_seconds   integer,
  source          text not null default 'microphone',
  session_label   text not null default 'Untitled Lecture',
  live_transcript text,
  attempts        integer not null default 0,
  heartbeat_at    timestamptz,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists lecture_jobs_user_idx
  on public.lecture_jobs (user_id, created_at desc);
-- Worker scan: open jobs ordered by staleness.
create index if not exists lecture_jobs_active_idx
  on public.lecture_jobs (status, heartbeat_at)
  where status in ('recording_complete', 'processing');

create table if not exists public.lecture_segments (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.lecture_jobs (id) on delete cascade,
  index            integer not null,
  r2_key           text not null,
  status           text not null default 'uploaded',
  duration_seconds integer,
  transcript_text  text,
  partial_notes    jsonb,
  attempts         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (job_id, index)
);

create index if not exists lecture_segments_job_idx
  on public.lecture_segments (job_id, index);

-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- Users may READ their own jobs/segments (dashboard + recovery) and INSERT/
-- UPDATE the rows the browser legitimately creates during recording (the job
-- row, segment rows, and the recording_complete transition). All PROCESSING
-- writes (claiming, transcribing, composing) are done by the worker using the
-- service-role key, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------
alter table public.lecture_jobs enable row level security;
alter table public.lecture_segments enable row level security;

-- lecture_jobs ---------------------------------------------------------------
drop policy if exists "Users read own jobs" on public.lecture_jobs;
create policy "Users read own jobs"
  on public.lecture_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own jobs" on public.lecture_jobs;
create policy "Users insert own jobs"
  on public.lecture_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own jobs" on public.lecture_jobs;
create policy "Users update own jobs"
  on public.lecture_jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- lecture_segments -----------------------------------------------------------
drop policy if exists "Users read own segments" on public.lecture_segments;
create policy "Users read own segments"
  on public.lecture_segments for select
  using (
    exists (
      select 1 from public.lecture_jobs j
      where j.id = lecture_segments.job_id and j.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own segments" on public.lecture_segments;
create policy "Users insert own segments"
  on public.lecture_segments for insert
  with check (
    exists (
      select 1 from public.lecture_jobs j
      where j.id = lecture_segments.job_id and j.user_id = auth.uid()
    )
  );
