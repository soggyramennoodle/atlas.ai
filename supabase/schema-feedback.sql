-- User-submitted reports about note quality or general product feedback.
create table if not exists public.user_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  note_id    uuid references public.notes (id) on delete set null,
  category   text not null check (category in ('inaccurate', 'wrong', 'other')),
  message    text,
  page_path  text,
  created_at timestamptz not null default now()
);

create index if not exists user_feedback_user_id_created_at_idx
  on public.user_feedback (user_id, created_at desc);

create index if not exists user_feedback_note_id_idx
  on public.user_feedback (note_id)
  where note_id is not null;

alter table public.user_feedback enable row level security;

drop policy if exists "Users insert own feedback" on public.user_feedback;
drop policy if exists "Users read own feedback"   on public.user_feedback;

create policy "Users insert own feedback"
  on public.user_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users read own feedback"
  on public.user_feedback for select
  using (auth.uid() = user_id);
