-- Unknown distance is NULL, never invented mileage. Existing rows remain unchanged.
begin;
alter table public.rides add column indoor boolean not null default false;
alter table public.rides alter column distance_m drop not null;
alter table public.rides add constraint rides_indoor_duration_distance_check
 check ((distance_m is not null or indoor) and (not indoor or duration_s > 0));
comment on column public.rides.distance_m is 'Recorded meters; NULL means unavailable for an indoor cycling recording.';
comment on column public.rides.indoor is 'Indoor or virtual cycling, based on provider/file metadata or rider selection.';
-- Existing grants, ownership policies, source restrictions, and source identities remain in force.
commit;
