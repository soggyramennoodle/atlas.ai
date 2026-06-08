-- Per-account theme preference (light / dark / system), synced across devices.
alter table public.user_profiles
  add column if not exists theme_preference text
  check (theme_preference is null or theme_preference in ('system', 'light', 'dark'));
