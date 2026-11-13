# RideVector installable web app

The existing GitHub/Vercel site remains the only web deployment. The `/install` guide is public. The manifest uses stable ID `/`, scope `/`, standalone display, and `/?source=homescreen` as its start URL. PNG icons are generated from the existing geometric brand mark with `node scripts/build-app-icons.mjs`; no new image dependency is needed.

The phone layout at 700 px and below uses Home, Rides, Coach, Plan, and More. More contains Races, Connections, account access, installation guidance, release notes, and privacy. CSS respects screen safe areas and gives form inputs 16 px text to avoid iPhone focus zoom. Navigation stores the current view in the URL fragment, and provider callbacks return to `/#connections`. This does not assume that Safari and an installed app share a sign-in session.

## Offline and privacy boundary

`scripts/build-pwa.mjs` derives the worker version from public file contents and the worker template. Run it after generating release notes. The Vercel build does this automatically; the checked-in `public/sw.js` is verified in CI. The worker has an explicit public allowlist for offline pages and their dependencies. It never runtime-caches responses. Root/dashboard HTML, API paths, authorization headers, non-GET requests, query-string assets, and all third-party requests are excluded from caching. Offline dashboard navigation shows `/offline.html`; static installation, privacy, and release pages can fall back to their precached copies when there is no query string. No private ride database, offline mutation queue, session cache, HealthKit access, or push subscription was introduced.

Already-open dashboard content stays in page memory when a connection drops. An offline status message explains the limits, and form submission is stopped until reconnection. Backend calls still require the existing authenticated network flow. Offline readiness depends on a successful first online worker install and browser storage retention; the guide says so.

## Updates

New workers wait. `pwa.js` offers Reload & update or Later. Reload is blocked while a dialog, disabled file input, or tracked dashboard task is active, and when offline. No tab automatically reloads because another tab activates an update. Only the tab explicitly choosing an idle reload refreshes after activation. The worker deletes only older caches with the RideVector public-cache prefix. Changing a public asset changes the worker hash, including account code changes even though account code is not precached.

## Validation

Run `node scripts/build-releases.mjs`, `node scripts/build-pwa.mjs`, both corresponding `--check` commands, `node scripts/check-release-notes.mjs`, and `node --test tests/pwa.test.mjs tests/release-notes.test.mjs`.

Browser checks cover phone and desktop layouts, More navigation, dialogs, theme, installation metadata/icon requests, service worker activation, public cache contents, real failed-network fallback, public release interactions, and update behavior. Physical iPhone validation remains distinct from desktop viewport testing: Safari Add to Home Screen, icon masking, standalone safe areas/keyboard behavior, login, and provider authorization through Safari should be exercised on a device before claiming they are device-verified. The repository's native iPhone/Health companion remains unbuilt and undistributed.

## Android installation

The shared manifest, standalone start URL, 192/512 PNG icons, maskable icon, and public service worker also support Android. `/install#android-steps` explains Chrome installation; `/install#iphone-steps` remains a stable link. Both guides work without JavaScript. Chrome menu labels vary by version: Install and create shortcut → Install, Add to Home screen, or Install app. No Play Store listing, native wrapper, health permission, or background tracking is required or introduced.

`install-prompt.js` handles browser-provided `beforeinstallprompt` events and `appinstalled`. Buttons remain hidden until eligible, all controls are disabled while the prompt is pending, consumed events cannot be reused, and dismissal/failure keeps manual instructions available. An accepted prompt is not described as completed installation until the browser sends `appinstalled`. Actual Android installation, launcher appearance, provider redirects, and file picking still require physical-device verification; desktop viewport checks and event tests are not on-device validation.
