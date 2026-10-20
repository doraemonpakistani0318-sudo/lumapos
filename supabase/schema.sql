-- LumaPOS: private per-account cloud backup/sync record.
-- Run this entire file in Supabase SQL Editor before using cloud sync.
create table if not exists public.shop_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"products":[],"sales":[],"settings":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.shop_data enable row level security;
alter table public.shop_data force row level security;

drop policy if exists "Users can read their own shop data" on public.shop_data;
drop policy if exists "Users can insert their own shop data" on public.shop_data;
drop policy if exists "Users can update their own shop data" on public.shop_data;
drop policy if exists "Staff can read owner shop data" on public.shop_data;
drop policy if exists "Staff can insert owner shop data" on public.shop_data;
drop policy if exists "Staff can update owner shop data" on public.shop_data;

create policy "Users can read their own shop data"
  on public.shop_data for select to authenticated
  using (auth.uid() = user_id);
create policy "Staff can read owner shop data"
  on public.shop_data for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff' and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::uuid = user_id);
create policy "Users can insert their own shop data"
  on public.shop_data for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Staff can insert owner shop data"
  on public.shop_data for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff' and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::uuid = user_id);
create policy "Users can update their own shop data"
  on public.shop_data for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Staff can update owner shop data"
  on public.shop_data for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff' and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::uuid = user_id)
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff' and (auth.jwt() -> 'app_metadata' ->> 'owner_id')::uuid = user_id);

revoke all on public.shop_data from anon;
grant select, insert, update on public.shop_data to authenticated;
