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
- Write for someone learning this codebase, not just for its original author.
  Explain a module, component, hook, or helper's role and purpose. Keep useful
  explanations of effects, timers, cleanup, and state coordination. Obvious small
  internal callbacks do not need a second explanation of the surrounding logic.
- Use `/** ... */` for function documentation so editors can show it on hover.
  Start by identifying the declaration's role and what it does. Describe relevant
  constraints, ordering, side effects, empty results, and failure behavior. Explain
  cancellation, partial success, or partial changes when they matter to callers.
  Accuracy and necessary context take priority over comment length. Prefer the
  shorter wording only when it communicates the same complete meaning.
  Add `@param` for units, accepted values, defaults, and other non-obvious input
  rules. Do not repeat TypeScript types or describe every line of code.
  Add `@returns` to authored value-returning functions, except obvious small
  internal callbacks. Every React component or callback that returns JSX must
  describe the returned interface with `@returns`, even for a small UI fragment.
  Document what a returned promise resolves to, including empty/failure outcomes
  where relevant. Void functions need their effects explained, not a filler
  return-value tag. Document the overall result rather than each return statement.
  Keep reusable component descriptions independent of their current callers.
  Use a minimal, complete `@example` when it teaches a non-obvious usage or data
  format. Include required props and any relevant state or language assumptions.
  Do not maintain a list of current call sites in a reusable component's comment.
  Explain abstract variables at their declaration: units, saved versus displayed
  values, version counters, and why mutable refs are separate from React state.
  Keep straightforward handlers brief; avoid repeating the same explanation.
  Add variable comments only when a reader needs context beyond the name/type,
  such as a flag's scope, a value's units, or the reason a snapshot is retained.
  Leave obvious variables uncommented and avoid repeating explanations nearby.
- Explain meaningful type aliases and interfaces by their role in the module.
  Place callback comments beside the callback or on its owning declaration so
  the reader can tell which operation is being explained. An effect's setup and
  cleanup should each say what they manage.
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

## UI boundaries

- `EventTour.tsx` owns guide progression, dismissal, and keyboard focus.
  `EventTourView.tsx` renders its trigger and overlay;
  `utils/use-tour-position.ts` manages target scrolling and viewport measurements.
  The measured card ref still points to the actual popup element.
- `Calendar.tsx` owns the visible month and composes the date picker.
  `CalendarControls.tsx` renders month/year input and navigation;
  `CalendarDates.tsx` renders weekday headings and controlled date choices.
- `AvailabilityGrid.tsx` keeps selection gestures, undo, viewport state, and
  shared cell context together. `AvailabilityGridTools.tsx` renders its controls;
  `AvailabilityGridBody.tsx` renders headings and time cells, forwarding the
  original scroll ref and pointer handlers to the same DOM surfaces.
- `TimeRangePicker.tsx` renders quarter-hour From/Until choices.
  `CreateEventPage.tsx` retains form state, time-order validation, and submission.

These boundaries do not introduce new DOM wrappers or change CSS hooks, saved
values, API calls, or event order. Keep cohesive small components, including
`DeleteResponsePopover`, together instead of making a view file for every return.

Keep existing SQL migrations byte-for-byte unchanged: their checksums are part
of the migration ledger. Add a new migration for an actual schema change.

Comment conventions follow the relevant parts of the
[Google TypeScript guide](https://google.github.io/styleguide/tsguide.html),
[Microsoft TSDoc](https://tsdoc.org/pages/tags/param/), and
[VS Code JSDoc support](https://code.visualstudio.com/docs/languages/javascript#_jsdoc-support).
