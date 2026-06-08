-- Admin-editable status pill on the marketing landing page.
create table if not exists public.site_announcement (
  id         int primary key default 1 check (id = 1),
  message    text not null default 'Atlas is now in beta! Get started now.',
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.site_announcement (id, message, enabled)
values (1, 'Atlas is now in beta! Get started now.', true)
on conflict (id) do nothing;

alter table public.site_announcement enable row level security;

drop policy if exists "Anyone can read enabled announcement" on public.site_announcement;
create policy "Anyone can read enabled announcement"
  on public.site_announcement for select
  using (enabled = true);
