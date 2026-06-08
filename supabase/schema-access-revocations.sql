-- Queued sign-out / ban notices with grace periods for active recordings.
create table if not exists public.access_revocations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('banned', 'global_logout')),
  grace        text not null check (grace in ('immediate', 'after_recording', 'after_upload')),
  status       text not null default 'pending' check (status in ('pending', 'completed')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists access_revocations_pending_user_idx
  on public.access_revocations (user_id)
  where status = 'pending';

alter table public.access_revocations enable row level security;

drop policy if exists "Users read own pending revocations" on public.access_revocations;
create policy "Users read own pending revocations"
  on public.access_revocations for select
  using (auth.uid() = user_id and status = 'pending');

-- Realtime so open tabs learn about a ban without waiting for the next navigation.
alter publication supabase_realtime add table public.access_revocations;
