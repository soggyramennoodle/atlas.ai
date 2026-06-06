-- Tracks the one-time Loops welcome email so profile edits do not resend it.
alter table public.user_profiles
  add column if not exists welcome_email_sent_at timestamptz;
