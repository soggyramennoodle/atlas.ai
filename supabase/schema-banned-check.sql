-- Banned-account lookup for the login screen.
--
-- The auth UI needs to know, at email-submit time, whether an email belongs to
-- a currently-banned account so it can show the "account locked" screen instead
-- of sending a magic link. Supabase has no built-in "find user by email" for
-- the client, and the auth schema isn't exposed to PostgREST — so this small
-- SECURITY DEFINER function reads `auth.users` on the server's behalf and
-- returns only a boolean (no PII leaves the database).
--
-- Execution is restricted to the service role; the public/anon/authenticated
-- roles cannot call it. The login server action invokes it with the
-- service-role key.

create or replace function public.is_account_banned(p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select u.banned_until is not null and u.banned_until > now()
      from auth.users u
      where lower(u.email) = lower(p_email)
      limit 1
    ),
    false
  );
$$;

revoke all on function public.is_account_banned(text) from public;
revoke all on function public.is_account_banned(text) from anon;
revoke all on function public.is_account_banned(text) from authenticated;
grant execute on function public.is_account_banned(text) to service_role;
