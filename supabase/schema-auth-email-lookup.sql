-- Email lookup for the login/signup form (existence + passkey routing).
--
-- Returns the auth user id for a normalized email, or null when no account
-- exists. Restricted to the service role — the login server action invokes it
-- with the admin client.

create or replace function public.get_auth_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.get_auth_user_id_by_email(text) from public;
revoke all on function public.get_auth_user_id_by_email(text) from anon;
revoke all on function public.get_auth_user_id_by_email(text) from authenticated;
grant execute on function public.get_auth_user_id_by_email(text) to service_role;
