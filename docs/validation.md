# Validation and release checks

## Automated verification

The migrated ChatGPT Sites app passes TypeScript checking and 32 automated tests. They cover time-zone conversions, daylight saving transitions, complete meeting-length matching, event and response lifecycles against a local PostgreSQL engine, secret edit and organizer permissions, stale updates, calendar downloads, invalid requests, client network errors, all three languages, and bounded write-rate protection.

The Vinext production build is checked independently. The original React design and scheduling logic are retained; the Sites entry point routes API requests to the existing server and serves the interface through the managed framework.

## Hosting and database

The existing Neon production database is retained with its existing schema. `DATABASE_URL` is configured as a server-only Sites runtime secret. No database credentials are present in this repository or the browser bundle.

The Site starts private for owner testing. Initial browser QA uses the internal preview, which has no production database secret. Production database connectivity and the event workflow were also verified at the deployed private Site.

## Integration testing with the owner

1. Check `/api/health` returns `ready: true` on the deployed Site.
2. Create an event with several dates and keep the organizer link.
3. Open a participant link in another browser or private window after public access is enabled for release testing.
4. Add two responses from different time zones and verify they refer to the same actual UTC moments.
5. Change the displayed time zone and each of the three website languages; confirm selected availability stays unchanged.
6. Reload the page, edit an existing response with its private link, and check that an older tab cannot overwrite a newer save.
7. Confirm a meeting as organizer, download the calendar invitation, and verify its local time in a calendar application.
8. On iOS Safari and Android Chrome, verify finger selection, zoom, scrolling, undo, and precise From/To editing.

The Sites fallback limits writes per running server instance, with bounded memory. Broader abuse/load testing remains part of public-release preparation.

## Live deployment verification

The private ChatGPT Site returned HTTP 200 with `ready: true` from `/api/health`. The following live checks passed against the existing Neon production database:

- Live event creation saved to Neon.
- Saved event reloads.
- Two participant responses saved.
- Different time-zone inputs produce the same whole-meeting match.
- Private response link can edit.
- Stale-tab overwrite rejected.
- Organizer permission enforced.
- Organizer confirms final meeting.
- Confirmed meeting exports as a calendar invitation.

A clearly labeled private test event was retained for owner review at `/e/30185723-1add-4a63-a204-3e1cd2e34824`. The multi-device and physical-phone checks above remain for the owner integration session. Public anonymous access has not been enabled.

## Desktop and mobile browser QA

The guide page and desktop layout were visually inspected. At a 390-pixel outer mobile frame (375-pixel content viewport), the landing page and event form fit without horizontal overflow. The time-zone search menu fit inside the viewport and found New York successfully. English, Simplified Chinese, and Spanish all fit the mobile viewport without horizontal overflow. These checks are browser layout checks, not physical-device touch tests.
