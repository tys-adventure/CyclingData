# RideVector

A private cycling dashboard deployed to https://cyclingdata.vercel.app through the existing Vercel project. Supabase provides email/password authentication and user-owned ride records.

## Features

- Responsive dashboard with a clearly labeled demo before sign-in, weekly distance, elevation gain, riding time, and ride count.
- Five dashboard ranges: Last week (trailing 7 days), Last month (trailing 30 days), Last 90 days, Last 6 months (calendar months), and Year to Date (January 1 through today), using the browser’s local timezone. Totals, adaptive daily/weekly/monthly charts, and recent rides follow the selected range. The weekly goal always uses the current Monday–Sunday week. Full paginated ride loading prevents totals from being limited to the first 500 records.
- GPX and TCX imports, CSV batch import (template provided), and manual ride entry. Files are limited to 10 MB; CSV files to 1,000 rides. Original files are parsed in the browser. Available route coordinates and sensor samples are stored privately with the ride, subject to ownership-based RLS. GPX duration is elapsed track time; TCX uses lap time. Elevation uses a 3-meter noise threshold, so results can differ from device software.
- SHA-256 file identity prevents repeated uploads of identical files.
- Supabase sign-up, email confirmation, sign-in, sign-out, and password reset.
- Strava authorization with expiring single-use state bound to an HttpOnly browser cookie, server-only tokens, refresh, import covering Year to Date and the last six months (up to 500 activities per import), activity webhooks, and disconnect with data removal. Imports are throttled to once per minute.

## Browser configuration

In Vercel → cyclingdata → Environment Variables, add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` from the Strava API application. Select Production and keep them secret. The Supabase integration supplies `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` (legacy service-role key is a fallback). Secrets must never use a public prefix.

In Strava API settings, use Website `https://cyclingdata.vercel.app` and Authorization Callback Domain `cyclingdata.vercel.app`. The callback is `/api/strava/callback`. A dedicated Strava application is required: the first connection automatically registers `/api/strava/webhook`. Strava controls the application's athlete capacity and API limits.

Supabase's Site URL is `https://cyclingdata.vercel.app`; the redirect allowlist contains `https://cyclingdata.vercel.app/`. Email confirmation remains enabled. Supabase's default mail service can restrict delivery and rate-limit email; configure custom SMTP before a broad public launch.

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
