-- Admin triage fields for user-submitted reports.
alter table public.user_feedback
  add column if not exists status text not null default 'unread'
    check (status in ('unread', 'read', 'resolved', 'dismissed'));

alter table public.user_feedback
  add column if not exists reporter_email text;

alter table public.user_feedback
  add column if not exists admin_notes text;

alter table public.user_feedback
  add column if not exists reviewed_at timestamptz;

create index if not exists user_feedback_status_created_at_idx
  on public.user_feedback (status, created_at desc);
