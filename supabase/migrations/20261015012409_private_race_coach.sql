create table public.coach_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 experience text not null check(experience in ('beginner','returning','intermediate','experienced')),
 available_days smallint[] not null check(cardinality(available_days) between 1 and 6 and available_days <@ array[0,1,2,3,4,5,6]::smallint[] and array_position(available_days,null) is null),
 weekly_minutes integer not null check(weekly_minutes between 30 and 1800),
 long_day smallint not null check(long_day between 0 and 6 and long_day=any(available_days)),
 long_minutes integer not null check(long_minutes between 15 and 480 and long_minutes<=weekly_minutes),
 planning_mph numeric(5,2) not null check(planning_mph between 5 and 30),
 baseline_miles numeric(7,2) check(baseline_miles>0 and baseline_miles<=1000),
 target_race_id uuid references public.races(id) on delete set null,
 started_week date not null check(started_week between date '2000-01-01' and date '2100-12-31' and extract(isodow from started_week)=1),
 created_at timestamptz not null default now()
);
create index coach_profiles_race_idx on public.coach_profiles(target_race_id);
alter table public.coach_profiles enable row level security;
revoke all on public.coach_profiles from public,anon,authenticated;
grant select,insert,update on public.coach_profiles to authenticated;
grant all on public.coach_profiles to service_role;
create policy coach_profiles_read on public.coach_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy coach_profiles_insert on public.coach_profiles for insert to authenticated with check ((select auth.uid())=user_id and (target_race_id is null or exists(select 1 from public.races r where r.id=target_race_id and r.user_id=(select auth.uid()))));
create policy coach_profiles_update on public.coach_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and (target_race_id is null or exists(select 1 from public.races r where r.id=target_race_id and r.user_id=(select auth.uid()))));
create table public.coach_checkins (
 user_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null check(week_start between date '2000-01-01' and date '2100-12-31' and extract(isodow from week_start)=1),
 recovery text not null default 'normal' check(recovery in ('fresh','normal','tired')),
 override_distance_m numeric(12,2) check(override_distance_m between 0 and 1609344),
 primary key(user_id,week_start)
);
alter table public.coach_checkins enable row level security;
revoke all on public.coach_checkins from public,anon,authenticated;
grant select,insert,update on public.coach_checkins to authenticated;
grant all on public.coach_checkins to service_role;
create policy coach_checkins_read on public.coach_checkins for select to authenticated using ((select auth.uid())=user_id);
create policy coach_checkins_insert on public.coach_checkins for insert to authenticated with check ((select auth.uid())=user_id);
create policy coach_checkins_update on public.coach_checkins for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
alter table public.training_sessions add column coach_key text check(char_length(coach_key)<=64);
create unique index training_sessions_coach_key_idx on public.training_sessions(user_id,coach_key);