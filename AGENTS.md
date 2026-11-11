# RideVector contribution instructions

## Release notes are part of every product update

When adding or changing a user-facing feature, behavior, fix, integration, or product UI, update the public release notes in the same change. This is a standing user requirement.

1. Add a dated entry to `public/releases.json`, newest first, or extend the newest entry when continuing the same release. Keep existing release IDs stable because readers can link to them. The journal automatically groups entries with the same date into one daily update; extend that day’s overview when needed, and preserve old direct-link aliases.
2. Describe the concrete rider-facing behavior. Use `new`, `improved`, or `fixed` for each change. Include relevant limits or availability. Never describe a pending provider approval, unbuilt companion, or development-only feature as shipped.
3. Use the user's America/New_York calendar date for publication. Don't invent semantic versions or retrospective dates. The existing history is based on verified repository commits.
4. Run `node scripts/build-releases.mjs` and include the generated `public/releases.html`.
5. Run `node scripts/check-release-notes.mjs` and the appropriate tests. Where Git history is available, also run `node scripts/check-release-notes.mjs --base <base-sha> --head HEAD`.
6. Keep links from the dashboard to `/releases` working, and preserve light/dark themes, keyboard navigation, mobile layouts and reduced-motion behavior.

The build generates a static readable journal; JavaScript adds search, filters, direct-link sharing and illustrative demos. Follow `docs/release-process.md` for the content schema and checks. Update the workshop section if a previously pending feature actually ships.

Preserve the existing GitHub/Vercel deployment and Supabase ownership model. Do not move this application to a different hosting platform as part of a page edit.
