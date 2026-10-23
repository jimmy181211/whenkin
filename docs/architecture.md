# Project Structure

Whenkin keeps page layout, scheduling rules, and server work in separate places.

| Location | What belongs here |
| --- | --- |
| `src/App.tsx` | Choose the page, set its language and title, and apply the shared layout. |
| `src/screens/` | The create-event, event, and how-it-works screens. |
| `src/screens/event/` | The event results sidebar and sharing dialog. These render data and call the page’s callbacks. |
| `src/components/` | Shared controls, the site header and footer, and the three-step guide. |
| `src/lib/` | Time-zone conversion, selection rules, date limits, browser storage, access-link parsing, types, and translations. |
| `lib/whenkin-api.ts` | The server’s stable entry point, HTTP routes, and request handling. |
| `lib/server/validation.ts` | Check event details, identifiers, and availability ranges. |
| `lib/server/event-queries.ts` | Read an event with the correct visibility and calculate meeting candidates in PostgreSQL. |
| `lib/server/tokens.ts` | Generate private tokens and hash them. |
| `migrations/` | The existing PostgreSQL schema history. |
| `worker/` and `scripts/` | Hosting, local development, build, installation, and deployment support. |

## Where to Make Changes

The event page owns loading, drafts, saving, selection, and refresh behavior. Its results and sharing components receive explicit props, so changing their layout does not require changing save logic. Shared form controls stay in `src/components`.

The server checks permissions before returning private responses or meeting suggestions. Client-side visibility does not grant access. Organizer links, participant edit links, storage keys, API paths, SQL statements, and database migrations retain their existing formats.

The `screens` directory is intentionally separate from Next/Vinext’s reserved `pages` directory, so screen modules do not create new public routes.

Add scheduling rules to `src/lib` when the browser and server both need them, as with date limits. Add request validation to `lib/server/validation.ts` and event-reading queries to `lib/server/event-queries.ts`. The API entry point re-exports its existing test and Worker interfaces.

## Verification

Run `pnpm run check`, `pnpm test`, and `pnpm run build`. The TypeScript check also rejects unused imports, local variables, and parameters. The structural refactor was checked against the earlier rendered output in all three languages, including organizer results and sharing states. The stylesheet and user-facing content were preserved.
