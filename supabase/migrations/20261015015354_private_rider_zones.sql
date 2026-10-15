create table public.rider_zones (
 user_id uuid primary key references auth.users(id) on delete cascade,
 ftp smallint check (ftp between 30 and 1000),
 hr_z2 smallint, hr_z3 smallint, hr_z4 smallint, hr_z5 smallint,
 constraint complete_hr_zones check (
 (hr_z2 is null and hr_z3 is null and hr_z4 is null and hr_z5 is null) or
 (hr_z2 is not null and hr_z3 is not null and hr_z4 is not null and hr_z5 is not null
 and hr_z2 between 30 and 297 and hr_z3 > hr_z2 and hr_z4 > hr_z3 and hr_z5 > hr_z4 and hr_z5 <= 300))
);
alter table public.rider_zones enable row level security;
revoke all on public.rider_zones from public, anon, authenticated;
grant select,insert,update on public.rider_zones to authenticated;
create policy zones_select on public.rider_zones for select to authenticated using ((select auth.uid())=user_id);
create policy zones_insert on public.rider_zones for insert to authenticated with check ((select auth.uid())=user_id);
create policy zones_update on public.rider_zones for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);