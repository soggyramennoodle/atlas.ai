-- Tracks completion of the in-app interface tour (spotlight walkthrough).
alter table public.user_profiles
  add column if not exists ui_tour_completed_at timestamptz;
