create table public.training_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 160),
 session_date date not null check(session_date between date '2000-01-01' and date '2100-12-31'),
 session_type text not null check(session_type in ('easy','endurance','tempo','intervals','rest')),
 duration_min integer check(duration_min between 1 and 1440),
 distance_m numeric(12,2) check(distance_m>0 and distance_m<=10000000),
 notes text not null default '' check(char_length(notes)<=1000),
 status text not null default 'planned' check(status in ('planned','completed','skipped')),
 archived boolean not null default false,
 created_at timestamptz not null default now(),
 constraint training_rest_no_targets check(session_type<>'rest' or (duration_min is null and distance_m is null))
);
create index training_sessions_user_date_idx on public.training_sessions(user_id,session_date,id);
alter table public.training_sessions enable row level security;
revoke all on public.training_sessions from public,anon,authenticated;
grant select,insert,update on public.training_sessions to authenticated;
grant all on public.training_sessions to service_role;
create policy training_read on public.training_sessions for select to authenticated using ((select auth.uid())=user_id);
create policy training_insert on public.training_sessions for insert to authenticated with check ((select auth.uid())=user_id);
create policy training_update on public.training_sessions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);