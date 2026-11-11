-- Run in the SQL Editor as postgres. All synthetic accounts/data roll back.
begin;
insert into auth.users (id,email) values
 ('91000000-0000-4000-8000-000000000001','ridevector-import-qa-a@example.invalid'),
 ('91000000-0000-4000-8000-000000000002','ridevector-import-qa-b@example.invalid');
set local role authenticated;
set local request.jwt.claims = '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.rides (id,user_id,name,started_at,distance_m,elevation_m,duration_s,source,source_id) values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Synthetic FIT test',now(),1000,10,300,'fit','synthetic-fit'),
 ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','Synthetic Health test',now(),1000,10,300,'apple_health','synthetic-health');
insert into public.ride_details (ride_id,payload) values
 ('92000000-0000-4000-8000-000000000001','{"source":"fit","streams":{}}');
do $$ begin
 if (select count(*) from public.rides where user_id='91000000-0000-4000-8000-000000000001')<>2 then raise exception 'Owner cannot read imported rides'; end if;
 begin
  insert into public.rides (user_id,name,started_at,distance_m,elevation_m,duration_s,source,source_id)
  values ('91000000-0000-4000-8000-000000000002','Wrong owner',now(),1000,10,300,'fit','forbidden');
  raise exception 'Cross-user insert unexpectedly permitted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.rides (user_id,name,started_at,distance_m,elevation_m,duration_s,source,source_id)
  values ('91000000-0000-4000-8000-000000000001','Fake provider',now(),1000,10,300,'wahoo','forbidden');
  raise exception 'Client provider insert unexpectedly permitted';
 exception when insufficient_privilege then null; end;
 begin
  update public.rides set source='garmin' where id='92000000-0000-4000-8000-000000000001';
  raise exception 'Client provider update unexpectedly permitted';
 exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims = '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$ begin
 if exists(select 1 from public.rides where user_id='91000000-0000-4000-8000-000000000001') then raise exception 'Cross-user ride read permitted'; end if;
 if exists(select 1 from public.ride_details where ride_id='92000000-0000-4000-8000-000000000001') then raise exception 'Cross-user recordings read permitted'; end if;
 begin
  insert into public.ride_details (ride_id,payload) values ('92000000-0000-4000-8000-000000000002','{}');
  raise exception 'Cross-user recordings insert permitted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: FIT and Apple Health writes; owner isolation; server-managed provider identities; private recordings' as validation;
rollback;
