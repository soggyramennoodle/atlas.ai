-- Profile picture stored in Cloudflare R2; key kept on the user profile row.
alter table public.user_profiles
  add column if not exists avatar_r2_key text;
