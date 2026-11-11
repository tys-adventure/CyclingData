# Provider integration status

Updated November 11, 2026.

Applicant: RideVector. Developer contact: thetylerjp@icloud.com.

## Submitted access requests

- Garmin Starter business request: submitted through https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/ . The form displayed “Thank you for your interest, we'll be reaching out to you soon.” Requested Activity API access. The selected business model is early-stage, monetization undecided, with possible freemium plans. Expected Garmin users: 0–100 in the next 12 months. Privacy URL: https://ridevector.app/privacy . No approval or credentials have been received in this session.
- Wahoo production application: RideVector, application ID 4002, https://developers.wahooligan.com/applications/4002 . The portal displays Pending Approval. No duplicate application was created. Sandbox and production require separate Wahoo applications; production status cannot be inferred from sandbox access.

Do not display a working Connect Garmin/Wahoo button until the matching provider access, credentials, callback configuration, implementation, and end-to-end validation are ready.

## First approved direct connector

The first provider that grants production access is the next connector. Implement against the documentation supplied for the approved product/tier rather than guessing endpoints from older programs.

The connector needs server-only credentials, browser-bound expiring single-use OAuth state, PKCE where required, granted-scope checks, token refresh, ownership-scoped imports, paging and rate handling, authenticated/deduplicated webhook delivery, and disconnect/revocation handling. Never accept a caller-supplied user ID as authorization. Validate provider activity types and normalize units, start dates, elapsed/timer/moving distinctions, and missing sensor values into the existing ride/detail format. Keep provider tokens inaccessible to browser roles.

Keep independent source records. The shared `uniqueRecordings` projection provides conservative cross-source counting across the dashboard, planner and coach; do not delete uploaded records because a provider reports a matching activity. Source selection prefers FIT/TCX/GPX before provider copies. Matches need start times within 30 seconds, distance difference within max(100 m, 2%), and duration difference within max(30 s, 5%). Sessions shorter than 60 seconds or under 100 meters remain separate unless their source identity is exact. Manual entries are never fuzzy-matched. A user can disable grouping under Connections to inspect every source copy.

Garmin's current Starter tier supplies pushes, limited user capacity and no historical data. Confirm its exact capacity and commercial upgrade terms before promising scale. Wahoo's approved production limits must also be confirmed. FIT/GPX/TCX/CSV uploads remain the historical-data fallback for both providers. The import dialog includes platform-specific export guidance and allows mixed-file batches.

## Release checks

Use real consenting test riders to verify OAuth denial/success, cookie/state expiry and mismatch, token refresh, duplicate events and replay, activity updates/deletion, partial permissions, paging, rate limits, disconnect, reconnect, cross-account isolation and repeated imports. Verify an imported ride and its available sensors from each approved source. No production connector is represented as complete in this snapshot.
