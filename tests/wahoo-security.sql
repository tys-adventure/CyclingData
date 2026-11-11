-- Run after the migration. Synthetic rows and users are always rolled back.
begin;
insert into auth.users(id) values ('8a6a1d6b-f6b0-4acb-9cbe-000000004002');
set local role service_role;
insert into public.wahoo_connections(user_id,wahoo_user_id,access_token,refresh_token,expires_at,scope)
values ('8a6a1d6b-f6b0-4acb-9cbe-000000004002',900000004002,'synthetic-access','synthetic-refresh',1,'user_read workouts_read');
insert into public.wahoo_oauth_states(state_hash,user_id,expires_at)
values (repeat('a',64),'8a6a1d6b-f6b0-4acb-9cbe-000000004002',now()+interval '10 minutes');
do $$begin
 if (select count(*) from public.wahoo_connections where user_id='8a6a1d6b-f6b0-4acb-9cbe-000000004002')<>1 then raise exception 'Service connection write failed'; end if;
 if (select count(*) from public.wahoo_oauth_states where state_hash=repeat('a',64))<>1 then raise exception 'Service state write failed'; end if;
end$$;
set local role authenticated;
do $$begin
 begin perform access_token from public.wahoo_connections; raise exception 'Token read unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform state_hash from public.wahoo_oauth_states; raise exception 'State read unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin update public.wahoo_connections set expires_at=0; raise exception 'Token write unexpectedly allowed'; exception when insufficient_privilege then null; end;
end$$;
set local role anon;
do $$begin
 begin perform access_token from public.wahoo_connections; raise exception 'Anonymous token read unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform state_hash from public.wahoo_oauth_states; raise exception 'Anonymous state read unexpectedly allowed'; exception when insufficient_privilege then null; end;
end$$;
reset role;
do $$begin
 if exists(select 1 from pg_class where oid in ('public.wahoo_connections'::regclass,'public.wahoo_oauth_states'::regclass) and not relrowsecurity) then raise exception 'RLS missing'; end if;
end$$;
rollback;
select 'PASS: service writes work; authenticated and anonymous tokens/states are inaccessible; RLS enabled; synthetic records rolled back' as result;
