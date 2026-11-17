# Code readability

Run `pnpm format` to apply the layout and `pnpm format:check` to verify it.
The same check runs in GitHub Actions. Prettier handles ordinary wrapping;
TypeScript-aware ESLint layout rules put object properties and array values on
separate lines. Formatting never runs database commands.

- Use two spaces and aim for 80 columns. Preserve literal text, URLs, SQL and
  generated-report templates when wrapping would change their contents.
- Put each object property and each item in a multi-item array on its own line.
  Keep a state/setter destructuring pair together. Long argument lists wrap.
- Leave a blank line between functions, including named arrow callbacks.
- Use names that describe their role. Keep public API fields, database columns,
  translation keys and CSS hooks stable.
- Name values with domain meaning, such as `AUTOSAVE_DELAY_MS`.
- Give substantial modules a short purpose comment. Explain a function's input,
  result or ordering constraint when callers need that information. Simple
  accessors and obvious event handlers need no repeated explanation.
- Extract a responsibility when it can be named and understood independently.
  Keep state that must change together in one owner. Line count alone does not
  determine a split.

## Existing directories

- `App/frontend/pages`: URL-level page composition.
- `App/frontend/components`: visible controls and reusable rendering.
- `App/frontend/utils`: frontend hooks and calculation helpers.
- `App/frontend/api`: browser HTTP transport.
- `App/frontend/i18n` and `content`: translations and legal documents.
- `App/backend/api`: one endpoint and its SQL per file.
- `App/backend/shared`: reused backend validation and queries.
- `App/backend/db`: connection code and migration history.
- `App/backend/tools`: explicit development and maintenance commands.
- `App/shared`: pure rules and types used across frontend/backend.
- `infra`: builds, Docker, hosting adapters and source-formatting tools.

`package.json` declares `"type": "module"`, so JavaScript uses `.js` throughout.
React components use `.tsx`; typed logic and hooks use `.ts`. Keep explicit
`.js` imports where the compiled Node backend requires them.

## Event page responsibilities

- `pages/EventPage.tsx` assembles the page, sharing feedback and display controls.
- `utils/use-event-response.ts` owns draft edits, autosave, response switching
  and deletion. They share revision/flight state and remain together.
- `utils/use-event-sync.ts` owns initial loading, visible-page refresh and expiry.
- `components/AvailabilityGrid.tsx` owns grid layout, drag gestures and undo.
- `components/AvailabilityCell.tsx` renders one block and its inspection/highlight.

Keep existing SQL migrations byte-for-byte unchanged: their checksums are part
of the migration ledger. Add a new migration for an actual schema change.
