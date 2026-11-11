begin;
-- Add file and companion sources without changing table grants or owner isolation.
alter table public.rides drop constraint rides_source_check;
alter table public.rides add constraint rides_source_check
  check (source in ('manual','gpx','tcx','csv','strava','fit','apple_health','garmin','wahoo'));
-- Direct provider identities remain server-managed, like Strava.
drop policy rides_insert on public.rides;
create policy rides_insert on public.rides for insert to authenticated
  with check ((select auth.uid())=user_id and source in ('manual','gpx','tcx','csv','fit','apple_health'));
drop policy rides_update on public.rides;
create policy rides_update on public.rides for update to authenticated
  using ((select auth.uid())=user_id and source in ('manual','gpx','tcx','csv','fit','apple_health'))
  with check ((select auth.uid())=user_id and source in ('manual','gpx','tcx','csv','fit','apple_health'));
drop policy details_insert on public.ride_details;
create policy details_insert on public.ride_details for insert to authenticated with check (
  exists(select 1 from public.rides r where r.id=ride_id and r.user_id=(select auth.uid())
    and r.source in ('manual','gpx','tcx','csv','fit','apple_health'))
);
drop policy details_update on public.ride_details;
create policy details_update on public.ride_details for update to authenticated using (
  exists(select 1 from public.rides r where r.id=ride_id and r.user_id=(select auth.uid())
    and r.source in ('manual','gpx','tcx','csv','fit','apple_health'))
) with check (
  exists(select 1 from public.rides r where r.id=ride_id and r.user_id=(select auth.uid())
    and r.source in ('manual','gpx','tcx','csv','fit','apple_health'))
);
commit;
