alter table public.rider_settings add column weekly_goal_miles numeric(8,2) not null default 62.14 check(weekly_goal_miles > 0 and weekly_goal_miles <= 10000);
update public.rider_settings set weekly_goal_miles=round(weekly_goal_km/1.609344,2);
create table public.ride_details (
 ride_id uuid primary key references public.rides(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<2000000),
 updated_at timestamptz not null default now()
);
alter table public.ride_details enable row level security;
revoke all on public.ride_details from public,anon,authenticated;
grant select,insert,update on public.ride_details to authenticated;
grant all on public.ride_details to service_role;
create policy details_read on public.ride_details for select to authenticated using (
 exists(select 1 from public.rides r where r.id=ride_id and r.user_id=(select auth.uid()))
);
create policy details_insert on public.ride_details for insert to authenticated with check (
 exists(select 1 from public.rides r where r.id=ride_id and r.user_id=(select auth.uid()) and r.source<>'strava')
);
create policy details_update on public.ride_details for update to authenticated using (
 exists(select 1 from public.rides r where r.id=ride_id and r.user_id=(select auth.uid()) and r.source<>'strava')
) with check (
 exists(select 1 from public.rides r where r.id=ride_id and r.user_id=(select auth.uid()) and r.source<>'strava')
);