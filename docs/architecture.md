# Project Structure

| Location | Purpose |
| --- | --- |
| `src/App.tsx` | Routes, language, and shared layout. |
| `src/screens/` | Creation, shared event page, and guide. |
| `src/screens/event/` | Shared results and the shared link dialog. |
| `src/components/` | Calendar, grid, time-zone selector, name field, and shared controls. |
| `src/lib/` | Time-zone conversion, selection, group counts, wheel scrolling, response selection, types, and translations. |
| `lib/whenkin-api.ts` | Event creation, shared reads, and shared response writes. |
| `lib/server/event-queries.ts` | Reads public event data, checks expiry, and keeps response writes scoped to their event. |
| `lib/server/common-ground.ts` | Calculates variable-length everyone-free intersections on the server. |
| `lib/server/validation.ts` | Validates event details and availability ranges. |
| `migrations/` | PostgreSQL schema history. |
| `scripts/cleanup.mjs` | Manually invoked cleanup method and command. |

## Matching

Common Ground sweeps range boundaries once and emits only intervals where every respondent is free. Overlapping ranges from one person count once. Touching common intervals merge, while true gaps remain separate. There is no secondary-match calculation or duration setting. The HTTP response retains an always-empty `missing` array so already-open older pages keep working until refreshed; current code does not read it.

## Availability Grid

The personal view paints or clears from the starting cell. The group view counts distinct saved respondents per UTC slot, with separate colors for both 15-minute halves of each 30-minute display row. View changes never alter a selection. Wheel scrolling handles fractional trackpad deltas, preserves browser zoom, and allows page scrolling at grid edges. Touch selection is unchanged.

## Access and Retention

All event links return group responses and Common Ground. Anyone with the link can edit a saved response by selecting its ID in The Group. PUT checks that the response belongs to the event, validates ranges, checks expiry, and uses an optimistic revision. It never updates a response from a different event. The browser saves the current form before switching members and can reload a conflicted response by selecting that member again. Legacy organizer and private fragments are ignored. Private tokens are no longer generated or checked.

The database checks response writes against expiry. Migration 007 retains historical meeting-length and credential columns solely for deployment compatibility. Current UI, API, and matching code do not use them. The old finalize and calendar endpoints have been removed with their meeting-length dependency.

Manual cleanup calls the existing database function in bounded transactions, then checks that no eligible events remain. No scheduler is required. See [Retention](retention.md).

## Verification

Run `npm run check`, `npm test`, and `npm run build`. The tests cover range boundaries, everyone-free intersections, shared access and edits, cross-event isolation, more than 1,000 responses, leap-year expiry, and manual cascade deletion. UI tests render the existing card classes in all three languages.
