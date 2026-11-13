-- Run as postgres in the SQL Editor. All synthetic users and rides roll back.
begin;
insert into auth.users(id,email) values
 ('93000000-0000-4000-8000-000000000001','ridevector-indoor-qa-a@example.invalid'),
 ('93000000-0000-4000-8000-000000000002','ridevector-indoor-qa-b@example.invalid');
set local role authenticated;
set local request.jwt.claims = '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.rides(id,user_id,name,started_at,distance_m,elevation_m,duration_s,indoor,source,source_id)
 values ('94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Synthetic indoor',now(),null,0,2700,true,'manual','synthetic-indoor');
insert into public.ride_details(ride_id,payload) values
 ('94000000-0000-4000-8000-000000000001','{"summary":{"average_hr":140,"average_watts":180,"notes":"Synthetic only"}}');
do $$ begin
 if not exists(select 1 from public.rides where id='94000000-0000-4000-8000-000000000001' and distance_m is null and indoor and duration_s=2700) then raise exception 'Indoor duration-only insert failed'; end if;
 begin
  update public.rides set indoor=false where id='94000000-0000-4000-8000-000000000001';
  raise exception 'Outdoor NULL distance accepted';
 exception when check_violation then null; end;
 begin
  update public.rides set duration_s=0 where id='94000000-0000-4000-8000-000000000001';
  raise exception 'Zero indoor duration accepted';
 exception when check_violation then null; end;
 begin
  update public.rides set user_id='93000000-0000-4000-8000-000000000002' where id='94000000-0000-4000-8000-000000000001';
  raise exception 'Ownership reassignment permitted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.rides(user_id,name,started_at,distance_m,elevation_m,duration_s,indoor,source,source_id)
  values ('93000000-0000-4000-8000-000000000001','Fake Wahoo',now(),null,0,2700,true,'wahoo','forbidden');
  raise exception 'Provider spoof permitted';
 exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims = '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$ begin
 if exists(select 1 from public.rides where id='94000000-0000-4000-8000-000000000001') then raise exception 'Cross-user ride read'; end if;
 if exists(select 1 from public.ride_details where ride_id='94000000-0000-4000-8000-000000000001') then raise exception 'Cross-user sensor read'; end if;
end $$;
reset role;
rollback;
select 'PASS: duration-only insert, constraints, sensor storage, ownership, and provider restrictions; synthetic data rolled back' as result;
