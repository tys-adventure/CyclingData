# RideVector iPhone companion

Open `RideVector.xcodeproj` with Xcode 16 or newer, select a signing team, and run on an iPhone with iOS 17 or newer. The bundle ID is `app.ridevector.companion`; change it if your developer account requires another ID. HealthKit is enabled in the entitlements. There are no third-party iOS dependencies or provider secrets.

The foreground Import button requests read-only workout, cycling-distance, workout-route, heart-rate, and cycling-power permissions. It reads cycling workouts from the last 90 days and imports summaries and available sensor/route samples into the account signed in at ridevector.app. Workout UUIDs make repeated imports idempotent. A HealthKit authorization success does not mean every read type was granted; missing readings stay missing. Workouts without distance have zero distance, rather than an inferred mileage. Timer duration is not labeled moving time. Apple Health does not provide reliable power-device provenance here.

The web view accepts the Health bridge only on the HTTPS RideVector origin and from the main frame. The bridge binds the import to the account active when the native import started and never exports a session token to native code. Other navigation opens outside the Health bridge. Sign in with email/password inside the companion. Strava authorization opened in Safari does not automatically share the companion's sign-in session; use the website for provider connections.

Deploy the updated `public/app.js` and apply the additional-ride-sources database migration before trying an import. The app imports on demand; there is no background Health sync, Apple Watch recording app, or automatic propagation of Health deletions. Delete imported records in RideVector separately. This is a development companion, not an App Store release.

Device validation is still required: sign-in, denial/partial Health permissions, no workouts, indoor rides without routes, HR/power with and without route samples, reimport, account change during an import, offline and partial-save retries, source-copy grouping, and revocation. Install Xcode and select the signing team before building. A real-device build and HealthKit authorization cannot be verified on a machine without Xcode.

Before distribution, supply app icons, review the privacy page and App Store privacy declarations, test on real devices, archive/sign, and submit through your Apple Developer account. No App Store acceptance is implied by this source project.
