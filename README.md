# RideVector

A private cycling dashboard deployed to https://ridevector.app through the existing Vercel project. Supabase provides email/password authentication and user-owned ride records.

## Features

- Responsive dashboard with a clearly labeled demo before sign-in, weekly distance, elevation gain, riding time, and ride count.
- Five dashboard ranges: Last week (trailing 7 days), Last month (trailing 30 days), Last 90 days, Last 6 months (calendar months), and Year to Date (January 1 through today), using the browser’s local timezone. Totals, adaptive daily/weekly/monthly charts, and recent rides follow the selected range. The weekly goal always uses the current Monday–Sunday week. Full paginated ride loading prevents totals from being limited to the first 500 records.
- GPX and TCX imports, CSV batch import (template provided), and manual ride entry. Files are limited to 10 MB; CSV files to 1,000 rides. Original files are parsed in the browser. Available route coordinates and sensor samples are stored privately with the ride, subject to ownership-based RLS. GPX duration is elapsed track time; TCX uses lap time. Elevation uses a 3-meter noise threshold, so results can differ from device software.
- SHA-256 file identity prevents repeated uploads of identical files.
- Supabase sign-up, email confirmation, sign-in, sign-out, and password reset.
- Strava authorization with expiring single-use state bound to an HttpOnly browser cookie, server-only tokens, refresh, import covering Year to Date and the last six months (up to 500 activities per import), activity webhooks, and disconnect with data removal. Imports are throttled to once per minute.

## Browser configuration

In Vercel → cyclingdata → Environment Variables, add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` from the Strava API application. Select Production and keep them secret. The Supabase integration supplies `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` (legacy service-role key is a fallback). Secrets must never use a public prefix.

In Strava API settings, use Website `https://ridevector.app` and Authorization Callback Domain `ridevector.app`. The callback is `/api/strava/callback`. A dedicated Strava application is required: the first connection automatically registers `/api/strava/webhook`. Strava controls the application's athlete capacity and API limits.

Supabase's Site URL is `https://ridevector.app`; the redirect allowlist contains `https://ridevector.app/`. Email confirmation remains enabled. Supabase's default mail service can restrict delivery and rate-limit email; configure custom SMTP before a broad public launch.

## Database

`supabase/migrations/001_cyclingdata.sql` records the schema already applied to the connected project. RLS isolates rides and settings by `auth.uid()`. Strava connections, states, and webhook configuration deliberately have no client-access policies and are accessible only to the server service role.

## Deployment

Push changes to `main`; the existing GitHub-connected Vercel project deploys them. This is a static frontend in `public/` with dependency-free Node 22 Vercel functions in `api/`. The browser SDK is pinned to Supabase JS 2.102.0. `vercel.json` selects the public directory and security headers. After changing secrets, redeploy so functions receive them.

## Validation

Run the ride and range tests in `tests/` for metrics, CSV, range boundaries, chart totals, leap years, and year rollover. Browser QA checks the real dashboard and GPX/TCX parsing. Database isolation checks ran inside a rollback transaction, including cross-user insert rejection, anonymous restrictions, and lack of client access to Strava tokens. Strava imports need real app credentials and athlete authorization to test end to end.

## Ride recordings and imperial units

Distances and goals display in miles, elevation in feet, and speed in mph. Underlying ride measurements remain in meters for accurate conversion; goals use a miles column with existing kilometer goals converted. CSV uploads accept the new miles/feet template and legacy kilometer/meter files.

Click a ride to view its private GPS route on OpenStreetMap, heart-rate and power streams when recorded, speed, elevation profile, distance over elapsed time, and elapsed/moving/stopped time. Strava details load on demand and are cached privately for up to 24 hours; activity-change webhooks invalidate cached recordings. Estimated Strava power and GPS-derived moving time are labeled. New GPX/TCX uploads retain available route and sensor samples; older summary-only uploads cannot recover recordings without the original file.

Charts support pointer inspection and arrow-key sample inspection. Route and graph samples are downsampled to at most 1,200 aligned points. OpenStreetMap receives map-tile requests for the displayed area; route coordinates themselves are drawn locally. Leaflet 1.9.4 is pinned with integrity checks, and visible map attribution is retained.

## Training trends and race planner

The Fitness vs. Fatigue chart follows all five dashboard ranges, preserving daily values when ranges change. It uses recorded duration in minutes as a volume proxy, with exponential responses of 42 days (Fitness) and 7 days (Fatigue), including zero-load rest days. The exact daily update is previous + (daily minutes - previous) * (1 - exp(-1 / response days)). These estimates are not TSS, Strava Fitness, readiness predictions, or intensity measurements. Starting values before the earliest recorded ride are zero; unavailable history can bias estimates downward. All loaded ride history contributes before cropping to the selected range. Pointer and keyboard inspection show both values and that day's recorded duration.

Upcoming races are saved in Supabase races with ownership RLS and no anonymous access. Add, edit, archive, and restore events with date, discipline, optional miles/feet, goal, and personal notes. Upcoming events always appear independently of the ride-date filter; past and archived events have a separate view. Browser-local calendar dates avoid UTC date shifts. Deterministic preparation tips adapt to the discipline, countdown, goal, course elevation, and longest recorded ride in the last 30 days. Free-text notes remain notes. Tips include links to USA Cycling and British Cycling and do not infer readiness from the volume chart. No external AI service receives race or ride data.

Race dates support an optional inclusive end date. Blank end dates preserve single-day events; date ordering is validated in both the client and database. Multi-day events remain on Upcoming races through the final day, with a Day N of M status while underway. Displayed distance and elevation are event totals; preparation tips explain stage planning and label average daily distance as an estimate. Fitness/Fatigue explanations are visible above the graph.

The My Races sidebar tab shares the dashboard race data, forms, archive/restore controls, and preparation tips. Both views refresh after edits.

The canonical public domain is https://ridevector.app. Browser visits to cyclingdata.vercel.app preserve path/query/fragment and redirect to the custom domain. The existing Strava webhook subscription stays at https://cyclingdata.vercel.app/api/strava/webhook to avoid interrupting activity notifications; API routes remain accessible at that host. OAuth callbacks and post-connection redirects use the custom domain. Supabase Site URL and redirect allowlist include the custom domain.

Strava callback failures return fixed, non-sensitive reason codes with actionable browser-session, expired-link, permission, and server-save messages. Logs record only the stage/reason, never OAuth codes, state values, credentials, or tokens. OAuth state/cookie validation stays required; scope parsing accepts comma- or whitespace-separated scopes.

Strava private-activity access is optional. New authorization requests include activity:read and activity:read_all as separate choices. The callback accepts either activity permission and stores the granted scope (preferring the token response when present). Connections shows whether private activities are included. Basic activity:read covers Everyone and Followers activities; Strava excludes Only You activities and privacy-zone data. Declining all activity access still blocks ride imports. Existing full-access connections continue to work.

## Training calendar, weekly recaps, and personal records

The Training tab combines all recorded rides, saved races (on every inclusive stage day), and private planned sessions/rest days. Sessions are stored in training_sessions with indexed user/date access and ownership RLS. Add/edit targets and notes, mark plans completed or skipped, and archive/restore plans. Completion is a planning check-in and never creates a ride or contributes to actual mileage. Month navigation and keyboard date selection use local calendar days, including across daylight-saving changes.

Weekly recaps appear on the dashboard and Training tab. Current-week totals compare the same elapsed weekdays with the prior week; historical completed weeks compare full Monday–Sunday periods. Recaps show recorded distance, climbing, time, rides, riding days, and separately tracked completion of due riding plans. Rest days are excluded from that completion denominator. Personal records cover the longest ride, most single-ride elevation gain, longest recorded duration, and biggest Monday–Sunday mileage week. Records link to ride details or the training calendar. They use all available imported ride history and include indoor/e-bike activities; no power best-effort records are inferred from summary data.

## Race-focused weekly coach

The Coach tab stores private coach_profiles and coach_checkins with ownership RLS; a selected race must belong to the same user. Setup captures experience, 1–6 available riding days, weekly time budget, maximum session length, preferred longer-ride day, a planning pace, and optional recent baseline mileage. The coach uses the preceding four complete weeks including zero-ride weeks unless the user supplies a baseline. It never infers competitiveness from mileage alone.

Weekly drafts use Base, Build, Recovery, Taper, and Race week phases. Numerical progression/reduction defaults are transparent RideVector heuristics, not a clinically or scientifically validated prescription. New/returning riders have no automatic preview growth; returning riders start lower for two weeks. Intermediate/experienced growth is capped at 3%/5% per preview week, for at most four weeks, within budget/session caps. Every fourth coach week reduces volume; the last two pre-race weeks and race week reduce it further. A tired check-in lowers suggestions; a user-edited mileage target takes precedence within the configured time budget. The weekly goal displayed elsewhere remains the user's independent manual goal.

Full-week allocations are calculated before filtering past days. Completed riding (distance and time), committed calendar targets, race days, and existing/archived coach entries prevent additional prescriptions or duplicates. The Add suggestions action saves only remaining proposed sessions/rest days without overwriting any plan; unique (user_id,coach_key) keys make repeated adds idempotent. Existing calendar sessions remain editable and are not silently regenerated after setup/check-in changes. No external AI service receives coaching profiles or check-ins.


### Power and heart-rate zones
Training → Power & heart-rate zones stores a private per-user FTP and optional four heart-rate bpm boundaries in `rider_zones`. Power zones use integer watt starts immediately above 55%, 75%, 90%, 105%, 120%, and 150% of FTP. Heart-rate boundaries are user editable; an optional general max-HR preset fills 60/70/80/90% starts without assuming age or maximum heart rate.
Individual ride details show time-weighted elapsed-recording distributions using current settings, including zero watts and stopped intervals with valid sensor data. Missing values and gaps over 120 seconds are excluded and reported. Data may already be downsampled by the existing telemetry importer, so distributions are estimates; averages alone never generate a distribution. Changes recalculate old rides. Duration-based Fitness/Fatigue remains unchanged; the coach now uses usable cached zone evidence as described below. Private RLS permits only owner select/insert/update. Sensor settings can be disabled by saving blank fields.

### Time, intensity, consistency, and recovery coach
The primary baseline is recorded ride minutes in the previous four complete weeks, including zero weeks. Mileage is a secondary estimate using the rider's planning pace and no longer ends the remaining time budget. User-entered baseline and target minutes adapt to the existing `baseline_miles` and `override_distance_m` fields through planning pace, preserving the existing schema. Legacy overrides are interpreted at the current planning pace; review overrides after a pace change. Calendar limits, archived coach keys, race stage days, no catch-up allocation, and existing plans are preserved.

Consistency shows unique riding days and active weeks. Preview growth pauses below three active weeks in four. Recovery check-ins retain normal/fresh/tired states; missing check-ins explicitly show recovery as unknown. A tired check-in reduces default time and keeps rides easy. Explicit edited time still takes precedence over volume reductions within budget/session caps.

Intensity is deterministic browser-side analysis of already-cached ride recordings from the last seven days, loaded through existing authenticated RLS. No AI service receives sensor data. Measured/unknown-device power with configured FTP is preferred; explicitly estimated power is excluded. Configured HR is a fallback, not an equivalent power score. Coverage must reach 60% of recorded duration for a ride to contribute. Zones 4+ are reported separately from missing evidence; gaps over two minutes remain excluded by `timeInZones`. Opening ride details updates coach evidence without bulk fetching all streams.

RideVector's conservative planning heuristics reduce the current week's default by 15% after a ride with at least 20 classified minutes in zones 4+ ending within 48 hours, or when rolling seven-day time exceeds baseline by 30%. Near-term sessions after the intensity flag remain easy; future preview weeks do not inherit today's 15% cut. These are not validated physiological recovery, injury risk, TSS, or readiness measures. Climbing is displayed as context and does not independently infer intensity. Existing Fitness/Fatigue charts are unchanged. These rules and their data limitations are explained in the coach.

