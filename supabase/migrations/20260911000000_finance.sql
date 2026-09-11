create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.months (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  data jsonb not null,
  version integer not null default 1 check (version > 0),
  primary key (user_id, month)
);
alter table public.settings enable row level security;
alter table public.months enable row level security;
revoke all on public.settings, public.months from anon;
grant select, insert, update on public.settings, public.months to authenticated;
drop policy if exists settings_owner on public.settings;
create policy settings_owner on public.settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists months_owner on public.months;
create policy months_owner on public.months for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
