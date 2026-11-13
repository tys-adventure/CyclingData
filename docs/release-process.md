# Keeping RideVector's journal current

Every product feature, behavior change, fix and UI update includes release notes in the same change. The canonical content is `public/releases.json`; `public/releases.html` is generated and stays readable without JavaScript. Build with `node scripts/build-releases.mjs`. The existing Vercel build runs the generator and validates the content before publishing.

Each entry has a stable URL-safe `id`, an actual `YYYY-MM-DD` publication date, `title`, `summary`, `area`, `visual`, and one or more `changes`. Each change has `type` (`new`, `improved`, `fixed`), `title`, and `text`. Supported visuals are `journal`, `imports`, `calendar`, `zones`, `foundations`, `install`, and `indoor`. Add another renderer if a future release needs a different visual. Do not shoehorn unrelated features into an inaccurate demonstration.

Write about what a rider can do now and any meaningful limitations. Pending integrations and development projects belong in the separately labeled workshop section in `lib/release-notes.mjs`. Remove or revise that pending description when the feature ships. Keep existing entry IDs stable; `/releases#bring-your-rides`, for example, is a permanent direct link. No unverified semantic versions or invented usage metrics are used.

The page automatically groups every publication with the same date into one daily card with a stable `day-YYYY-MM-DD` link. Keep all original entry IDs: they remain working aliases, and search includes the original titles and summaries. Optional `daily: {title, summary}` metadata on the first entry for that date supplies the daily card’s overview. The preview selector retains every distinct illustration and interactive example from that day. Details start collapsed for a compact journal. For a new publication, prepend an entry. When iterating on the same publication, revise the newest entry. Publication dates use America/New_York calendar days. Historical entries were grouped from the actual repository commits and converted to that timezone. The hero is AI-generated editorial imagery; its on-page caption distinguishes it from a documented real ride. Demonstrations use labeled sample data and do not change the rider's account.

Validation:

```
node scripts/build-releases.mjs
node scripts/build-releases.mjs --check
node scripts/build-pwa.mjs
node scripts/build-pwa.mjs --check
node scripts/check-release-notes.mjs
node --test tests/release-notes.test.mjs
```

The release-notes workflow also compares product files with the event's base commit. Runtime changes under `public/`, `api/`, `lib/`, `ios/`, and database migrations, plus package/deployment changes, require a semantic update to the newest release entry. This broad check intentionally errs toward documenting a change; it can't infer user-visible intent from a diff. Documentation-only and test-only changes do not require a new release. Whitespace-only edits to the release JSON do not satisfy the guard.

The workflow is a CI signal; it does not configure branch-protection rules or prevent every possible direct push. Treat a failing release check as unfinished release work. The standing instruction in `AGENTS.md` applies even when a change is made outside CI. This is a contributor workflow, not a scheduled automation.

The sign-in-free playground uses the shared file parser and duplicate projection with temporary in-memory records. Sample Wahoo actions do not contact Wahoo or authorize an account. Local FIT/GPX/TCX/CSV previews never save to Supabase, draw external map tiles, or upload original files. Leaving the page or resetting the demo clears imported preview records. Keep this boundary when adding demonstrations; real provider authorization belongs in the signed-in dashboard.

The installable web app worker is generated after release HTML. Include `public/sw.js` whenever public assets change, even if only the notes changed; its content version offers users a controlled update. New offline assets must be explicitly added to the public allowlist and tested. Do not add dashboard HTML, authentication, private records, provider responses, or mutation queues to that cache. See `docs/installable-web-app.md`.
