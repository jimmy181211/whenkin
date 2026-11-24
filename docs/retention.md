# Retention and Manual Cleanup

The administrator-controlled duration is a positive whole number of **calendar months**. Its initial
value is **12**, equivalent to one calendar year in UTC. Month-end dates clamp to the last valid
day: January 31 plus one month becomes February 28, and February 29 plus 12 months becomes February
28 of the following year. Responding and editing do not extend a deadline.

`009_configurable_retention.sql` creates the single policy row, a validated setter, the common
deadline calculation and the updated cleanup function. Applying this migration preserves all
existing event deadlines and performs no cleanup. Historical migration files are unchanged.

## Class and configuration

`App/backend/tools/cleanup.js` exports `EventCleanup`. Its constructor accepts a database query
callback and `time = 12`. The constructor validates the duration and performs no database writes.
`getTime()` returns months. `setTime(months)` validates and persists the policy, and updates
existing deadlines from each event's original creation time in the same database transaction. It
does not delete records.

```js
import { EventCleanup } from './App/backend/tools/cleanup.js';
const query = (sql, params) => database.query(sql, params);

const cleanup = await EventCleanup.load(query); // Load the persisted policy.
cleanup.getTime();                            // Initially 12; units are months.
await cleanup.setTime(2);                     // Administrator operation: update all link deadlines.
await cleanup.dryRun();                       // Count eligible event rows; delete nothing.
await cleanup.run();                          // Explicitly delete eligible rows and their children.
```

The setter accepts integers from 1 to 1200. Values are SQL parameters, not interpolated SQL. The
database also validates them, and its setter is not executable by PUBLIC. No visitor API can change
the policy or run cleanup.

The supported public metadata endpoint is `GET /api/retention`, returning
`{ "value": 12, "unit": "month" }`. `EventLimits` is the shared presentation component for the
creation form, response-page footer, unavailable-event explanation and policy duration text.
Translation keys supply month/year labels and singular/plural forms. Exact multiples of 12 display
in years. If metadata cannot be loaded, the UI shows a general retention message rather than
guessing a duration.

## Manual commands

Supply server-only `DATABASE_URL` in a trusted terminal, then run:

```sh
pnpm db:cleanup --dry-run
pnpm db:cleanup
```

These commands load the persisted policy. To preview a proposed duration without changing policy or
data:

```sh
pnpm db:cleanup --months 2 --dry-run
```

`pnpm db:cleanup --months 2` explicitly applies the proposed duration and then deletes eligible
records. A custom constructor duration passed to `run()` has the same behavior. Shortening retention
can expire existing links sooner; review the dry run first.

Cleanup still runs only when an administrator invokes it. There is no timer or new schedule. Each
batch is bounded; locked old records produce a retry message. Eligibility follows creation age under
the active policy, even if an individual stored expiry was changed incorrectly. Foreign keys remove
an old event's windows, responses and availability with it. API expiry checks operate before
physical cleanup.

## Verification and release

`pnpm db:verify-retention` uses disposable PGlite and synthetic timestamps to test 1, 2 and 12
months. Evidence is written to ignored `outputs/retention-months-verification/`. It never reads
`DATABASE_URL` or modifies production. Earlier reports in other output directories remain separate
historical evidence.

Before releasing the new application, apply migration 009 to its database using `pnpm db:migrate`.
GitHub's current `Check Whenkin` workflow runs tests, builds and Docker checks; it does not deploy
the hosted website. A push to `main` alone does not publish these changes or migrate the production
database.
