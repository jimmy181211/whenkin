# Project Structure

| Location | Purpose |
| --- | --- |
| `src/App.tsx` | Routes, language, and shared layout. |
| `src/screens/` | Creation, shared event page, and guide. |
| `src/screens/event/` | Shared results and the one-link sharing dialog. |
| `src/components/` | Calendar, grid, time-zone selector, name field, and shared controls. |
| `src/lib/` | Time-zone conversion, selection, browser storage, response identities, types, and translations. |
| `lib/whenkin-api.ts` | Event creation, shared reads, and private response writes. |
| `lib/server/event-queries.ts` | Reads public event data, checks expiry, and verifies response tokens when supplied. |
| `lib/server/common-ground.ts` | Calculates variable-length primary and secondary intersections on the server. |
| `lib/server/validation.ts` | Validates event details and availability ranges. |
| `migrations/` | PostgreSQL schema history. |
| `scripts/cleanup.mjs` | Manually invoked cleanup method and command. |

## Matching

Common Ground uses a sweep over range boundaries, rather than testing every possible meeting duration or scanning the grid separately for each person. It handles touching and overlapping ranges, event-window gaps, and a fixed missing person for each secondary interval. All matching periods include their attendee ID lists. Matching runs once on the server; the browser does not have a second implementation.

## Access and Retention

All shared links return group responses and Common Ground. Response updates still check the private edit token and optimistic revision. Historical organizer fragments are ignored. Creation no longer issues an organizer token.

The database checks response writes against expiry. Migration 007 retains historical meeting-length and organizer columns solely for deployment compatibility. Current UI, API, and matching code do not use them. The old finalize and calendar endpoints have been removed with their meeting-length dependency.

Manual cleanup calls the existing database function in bounded transactions, then checks that no eligible events remain. No scheduler is required. See [Retention](retention.md).

## Verification

Run `npm run check`, `npm test`, and `npm run build`. The tests cover range boundaries, fixed secondary attendees, shared access, private writes, more than 1,000 responses, leap-year expiry, and manual cascade deletion. UI tests render the existing card classes in all three languages.
