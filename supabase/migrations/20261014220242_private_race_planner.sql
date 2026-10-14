create table public.races (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 160),
 race_date date not null check(race_date between date '2000-01-01' and date '2100-12-31'),
 race_type text not null check(race_type in ('road','gravel','mtb','tt','crit','sportive')),
 distance_m numeric(12,2) check(distance_m > 0 and distance_m <= 10000000),
 elevation_m numeric(10,2) check(elevation_m >= 0 and elevation_m <= 100000),
 goal text not null default 'finish' check(goal in ('finish','personal_best','compete')),
 notes text not null default '' check(char_length(notes)<=1000),
 archived boolean not null default false,
 created_at timestamptz not null default now()
);
create index races_user_date_idx on public.races(user_id,race_date,id);
alter table public.races enable row level security;
revoke all on public.races from public,anon,authenticated;
grant select,insert,update on public.races to authenticated;
grant all on public.races to service_role;
create policy races_read on public.races for select to authenticated using ((select auth.uid())=user_id);
create policy races_insert on public.races for insert to authenticated with check ((select auth.uid())=user_id);
create policy races_update on public.races for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);