# Provider integration status

Updated November 11, 2026.

Applicant: RideVector. Developer contact: thetylerjp@icloud.com.

## Submitted access requests

- Garmin Starter business request: submitted through https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/ . The form displayed “Thank you for your interest, we'll be reaching out to you soon.” Requested Activity API access. The selected business model is early-stage, monetization undecided, with possible freemium plans. Expected Garmin users: 0–100 in the next 12 months. Privacy URL: https://ridevector.app/privacy . No approval or credentials have been received in this session.
- Wahoo production application: RideVector, application ID 4002, https://developers.wahooligan.com/applications/4002 . Production approval was verified in the portal on November 11, 2026. Production credentials are configured as Vercel Production Secret variables, and the callback is set to https://ridevector.app/api/wahoo/callback . The connector is prepared for deployment; a consenting rider's live authorization/import verification remains pending. No duplicate application was created. Sandbox and production are separate Wahoo applications.

Do not display a working Connect Garmin/Wahoo button until the matching provider access, credentials, callback configuration, implementation, and end-to-end validation are ready.

## First approved direct connector

The first provider that grants production access is the next connector. Implement against the documentation supplied for the approved product/tier rather than guessing endpoints from older programs.

The connector needs server-only credentials, browser-bound expiring single-use OAuth state, PKCE where required, granted-scope checks, token refresh, ownership-scoped imports, paging and rate handling, and disconnect/revocation handling. Before enabling background notifications, add authenticated/deduplicated webhook delivery. Never accept a caller-supplied user ID as authorization. Validate provider activity types and normalize units, start dates, elapsed/timer/moving distinctions, and missing sensor values into the existing ride/detail format. Keep provider tokens inaccessible to browser roles.

Keep independent source records. The shared `uniqueRecordings` projection provides conservative cross-source counting across the dashboard, planner and coach; do not delete uploaded records because a provider reports a matching activity. Source selection prefers FIT/TCX/GPX before provider copies. Matches need start times within 30 seconds, distance difference within max(100 m, 2%), and duration difference within max(30 s, 5%). Sessions shorter than 60 seconds or under 100 meters remain separate unless their source identity is exact. Manual entries are never fuzzy-matched. A user can disable grouping under Connections to inspect every source copy.

Garmin's current Starter tier supplies pushes, limited user capacity and no historical data. Confirm its exact capacity and commercial upgrade terms before promising scale. Wahoo's approved production limits must also be confirmed. FIT/GPX/TCX/CSV uploads remain the historical-data fallback for both providers. The import dialog includes platform-specific export guidance and allows mixed-file batches.

## Release checks

Use real consenting test riders to verify OAuth denial/success, cookie/state expiry and mismatch, token refresh, duplicate events and replay, activity updates/deletion, partial permissions, paging, rate limits, disconnect, reconnect, cross-account isolation and repeated imports. Verify an imported ride and its available sensors from each approved source. No production connector is represented as complete in this snapshot.

## Wahoo implementation

- Official reference: https://cloud-api.wahooligan.com/ . Production quotas documented there: 200 requests/5 minutes, 1,000/hour, 5,000/day. Rate-limit responses are surfaced; imports have a one-minute cooldown and an exclusive 90-second connection lease to serialize rotating token use. API requests have 10-second timeouts; the function limit is 60 seconds. Failed partial batches are safe to retry through source-key upserts.
- Confidential OAuth flow uses only `user_read workouts_read`, with callback `https://ridevector.app/api/wahoo/callback`. Server environment: `WAHOO_CLIENT_ID`, `WAHOO_CLIENT_SECRET`. Both belong in Vercel Production Secret variables, never `public/`, source control, shell arguments, or release notes. Wahoo refresh only occurs immediately before an API request; `/v1/user` retires the previous rotating token.
- `api/wahoo/[action].mjs` dispatches the five routes in one Vercel function, keeping this Hobby project below its 12-function allocation. Owner identity always comes from a validated Supabase bearer token, or from the consumed browser-bound OAuth state.
- Database migration: `20261111222649_wahoo_connector.sql`. Applied through the authenticated Supabase SQL editor. `tests/wahoo-security.sql` passed live: server writes succeeded, anonymous/authenticated token and state reads failed, authenticated token updates failed, RLS was enabled. Synthetic test rows/users rolled back. No client grants or policies expose token/state tables.
- Imports are explicitly requested, not background pushes: up to five pages of 30 workouts, with an older-history cursor. Completed cycling workouts only; exclude motorcycling and planned workouts. Summary decimals are normalized into meters/seconds. Active duration is timer time, not inferred moving time. Save available sensor averages without inventing sensor streams. Original FIT files remain the map/graph and unavailable-history fallback. Wahoo excludes completed workouts originating in third-party apps.
- Reimports upsert the same Wahoo workout ID; matching other-source records stay independent and are grouped by the shared duplicate projection. Disconnect revokes `/v1/permissions` and deletes server connection tokens, retaining imported rides. Removing a ride is an independent user action. Background delivery and provider deletion reconciliation are not enabled.
- Automated tests cover state binding/replay/denial, scope checks, rotating refresh, owner-scoped history/details, rate/concurrency gates, failed imports, and disconnect retention. Live OAuth consent and real workout comparison remain necessary before claiming end-to-end verification. Do not exercise disconnect against a real rider just to test it without approval.
