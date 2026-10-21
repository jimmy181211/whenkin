# What has been checked

The first version passes 29 automated checks against its time-handling code, network error handling, and a local PostgreSQL engine.

The checks cover:

- The same moment entered in Los Angeles and New York.
- Summer and winter offsets, fractional-hour zones, and changes of date.
- Repeated and missing clock times during daylight saving changes.
- Compact availability ranges and complete meeting-length comparisons.
- Event creation, saved and empty responses, and suggested times calculated in PostgreSQL.
- Private response-edit permissions, organizer permissions, and conflicting edits from older tabs.
- Calendar downloads and invalid requests.
- Clear errors when the server is unreachable, and rejection of static HTML pages returned in place of API responses.

The TypeScript checks, production website build, and Cloudflare Worker dry-run bundle also pass.

Browser checks cover the desktop scheduling page and a 390-pixel mobile rendering, marking a slot, searching for New York, and confirming that the selected actual moment stays unchanged after switching time zones.

The mobile rendering check is not a test on a physical phone. Finger dragging should also be tested on iOS Safari and Android Chrome before wider release.

The full application source, branding reference, README, flowcharts, migrations, tests, and GitHub checks workflow are now uploaded to `jimmy181211/whenkin` on its `main` branch. A separate Whenkin organization and project are now set up on Neon’s Free plan. The schema was applied and checked on a development branch before it was applied to the empty production database. PostgreSQL confirmed cross-zone equality and a full 60-minute shared window for Los Angeles and New York inputs. Cloudflare publication and live browser verification are still pending.

## Languages and the guide

English is the default. The header offers Simplified Chinese and Spanish, and the browser remembers the chosen language. Forms, the guide, grid controls, status messages, errors, and date/time labels use that language. Names, notes, and event titles keep the text people entered.

The demo page and its links have been removed. The three steps say what the organizer, participants, and Whenkin each do.

Rendering checks cover all three languages, the guide, removal of the demo route, remembered preferences, and unchanged UTC selections after changing language. These latest changes could not be visually checked in the browser because its sign-in session could not resume. The earlier desktop and mobile browser checks described above were completed before these language changes.

## Resume verification

On October 20, 2026 (Pacific time), the recovered source passed all 29 tests, TypeScript checking, the production build, and the Cloudflare Worker dry run again. GitHub write access was verified through the successful source upload. Wrangler is not authenticated, and the Cloudflare dashboard shows its sign-in form; publication still requires account sign-in.
