begin;
create table public.wahoo_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 wahoo_user_id bigint not null unique,
 connection_id uuid not null default gen_random_uuid(),
 access_token text not null,
 refresh_token text not null,
 expires_at bigint not null,
 scope text not null,
 last_synced_at timestamptz,
 next_page integer check(next_page is null or next_page>0),
 last_import_attempt timestamptz,
 operation_id uuid,
 busy_until timestamptz
);
alter table public.wahoo_connections enable row level security;
revoke all on public.wahoo_connections from public,anon,authenticated;
grant select,insert,update,delete on public.wahoo_connections to service_role;
create table public.wahoo_oauth_states (
 state_hash text primary key check(state_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null
);
create index wahoo_oauth_states_user_idx on public.wahoo_oauth_states(user_id);
create index wahoo_oauth_states_expiry_idx on public.wahoo_oauth_states(expires_at);
alter table public.wahoo_oauth_states enable row level security;
revoke all on public.wahoo_oauth_states from public,anon,authenticated;
grant select,insert,delete on public.wahoo_oauth_states to service_role;
commit;
