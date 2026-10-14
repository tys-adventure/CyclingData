# CyclingData

A private cycling dashboard deployed to https://cyclingdata.vercel.app through the existing Vercel project. Supabase provides email/password authentication and user-owned ride records.

## Features

- Responsive dashboard with a clearly labeled demo before sign-in, weekly distance, elevation gain, riding time, and ride count.
- Eight-week distance chart, editable weekly goal, searchable journal, ride detail, and deletion.
- GPX and TCX imports, CSV batch import (template provided), and manual ride entry. Files are limited to 10 MB; CSV files to 1,000 rides. Summaries are stored; original files and coordinates stay in the browser. GPX duration is elapsed track time; TCX uses lap time. Elevation uses a 3-meter noise threshold, so results can differ from device software.
- SHA-256 file identity prevents repeated uploads of identical files.
- Supabase sign-up, email confirmation, sign-in, sign-out, and password reset.
- Strava authorization with expiring single-use state bound to an HttpOnly browser cookie, server-only tokens, refresh, import of the last 90 days (up to 500 activities), activity webhooks, and disconnect with data removal. Imports are throttled to once per minute.

## Browser configuration

In Vercel → cyclingdata → Environment Variables, add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` from the Strava API application. Select Production and keep them secret. The Supabase integration supplies `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` (legacy service-role key is a fallback). Secrets must never use a public prefix.

In Strava API settings, use Website `https://cyclingdata.vercel.app` and Authorization Callback Domain `cyclingdata.vercel.app`. The callback is `/api/strava/callback`. A dedicated Strava application is required: the first connection automatically registers `/api/strava/webhook`. Strava controls the application's athlete capacity and API limits.

Supabase's Site URL is `https://cyclingdata.vercel.app`; the redirect allowlist contains `https://cyclingdata.vercel.app/`. Email confirmation remains enabled. Supabase's default mail service can restrict delivery and rate-limit email; configure custom SMTP before a broad public launch.

## Database

`supabase/migrations/001_cyclingdata.sql` records the schema already applied to the connected project. RLS isolates rides and settings by `auth.uid()`. Strava connections, states, and webhook configuration deliberately have no client-access policies and are accessible only to the server service role.

## Deployment

Push changes to `main`; the existing GitHub-connected Vercel project deploys them. This is a static frontend in `public/` with dependency-free Node 22 Vercel functions in `api/`. The browser SDK is pinned to Supabase JS 2.102.0. `vercel.json` selects the public directory and security headers. After changing secrets, redeploy so functions receive them.

## Validation

Run `node tests/rides.test.mjs` for metric, CSV, and input checks. Browser QA checks the real dashboard and GPX/TCX parsing. Database isolation checks ran inside a rollback transaction, including cross-user insert rejection, anonymous restrictions, and lack of client access to Strava tokens. Strava imports need real app credentials and athlete authorization to test end to end.
