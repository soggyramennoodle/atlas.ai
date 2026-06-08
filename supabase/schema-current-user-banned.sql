-- Ban enforcement for users who still hold a session cookie after being banned.
-- The login screen already blocks new sign-ins; this lets middleware reject
-- existing sessions on the next request.

create or replace function public.current_user_is_banned()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select u.banned_until is not null and u.banned_until > now()
      from auth.users u
      where u.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

revoke all on function public.current_user_is_banned() from public;
grant execute on function public.current_user_is_banned() to authenticated;
