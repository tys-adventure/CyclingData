create table public.rides (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 160),
 started_at timestamptz not null,
 distance_m numeric(12,2) not null check(distance_m between 0 and 10000000),
 elevation_m numeric(10,2) not null check(elevation_m between 0 and 100000),
 duration_s integer not null check(duration_s between 0 and 604800),
 source text not null check(source in ('manual','gpx','tcx','csv','strava')),
 source_id text not null,
 created_at timestamptz not null default now(),
 unique(user_id,source,source_id)
);
create index rides_user_started_idx on public.rides(user_id, started_at desc);
alter table public.rides enable row level security;
revoke all on public.rides from anon, authenticated;
grant select, insert, update, delete on public.rides to authenticated;
grant all on public.rides to service_role;
create policy rides_read on public.rides for select to authenticated using ((select auth.uid())=user_id);
create policy rides_insert on public.rides for insert to authenticated with check ((select auth.uid())=user_id and source <> 'strava');
create policy rides_update on public.rides for update to authenticated using ((select auth.uid())=user_id and source <> 'strava') with check ((select auth.uid())=user_id and source <> 'strava');
create policy rides_delete on public.rides for delete to authenticated using ((select auth.uid())=user_id);
create table public.rider_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 weekly_goal_km integer not null default 100 check(weekly_goal_km between 1 and 10000)
);
alter table public.rider_settings enable row level security;
revoke all on public.rider_settings from anon, authenticated;
grant select,insert,update on public.rider_settings to authenticated;
grant all on public.rider_settings to service_role;
create policy settings_read on public.rider_settings for select to authenticated using ((select auth.uid())=user_id);
create policy settings_insert on public.rider_settings for insert to authenticated with check ((select auth.uid())=user_id);
create policy settings_update on public.rider_settings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.strava_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 athlete_id bigint not null unique,
 access_token text not null,
 refresh_token text not null,
 expires_at bigint not null,
 scope text not null,
 last_synced_at timestamptz
);
alter table public.strava_connections enable row level security;
revoke all on public.strava_connections from public, anon, authenticated;
grant all on public.strava_connections to service_role;
create table public.strava_oauth_states (
 state_hash text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null
);
create index strava_states_user_idx on public.strava_oauth_states(user_id);
alter table public.strava_oauth_states enable row level security;
revoke all on public.strava_oauth_states from public,anon,authenticated;
grant all on public.strava_oauth_states to service_role;
CREATE TABLE public.strava_app_state(id integer primary key check(id=1),subscription_id bigint not null); ALTER TABLE public.strava_app_state ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.strava_app_state FROM public,anon,authenticated; GRANT ALL ON public.strava_app_state TO service_role; ALTER TABLE public.strava_connections ADD COLUMN last_import_attempt timestamptz;
