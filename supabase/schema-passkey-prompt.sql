-- Tracks when a user dismissed the one-time passkey enrollment prompt.
alter table public.user_profiles
  add column if not exists passkey_prompt_dismissed_at timestamptz;
