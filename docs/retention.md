# Retention and Manual Cleanup

Every event link expires one calendar year after creation, calculated in UTC. Existing events use their original creation date. A February 29 event expires on February 28 of the following year. Responding or editing does not extend the deadline.

The API rejects expired event reads and response writes even before cleanup. Saved data remains until an administrator runs the manual operation. There is no participant cap and no automatic cleanup schedule.

## Run Manually

Set the server-only `DATABASE_URL` in a trusted terminal environment, then run:

```sh
npm run db:cleanup -- --dry-run
npm run db:cleanup
```

The dry run counts eligible events without deleting data. The cleanup command repeatedly calls `public.purge_expired_events(100)` until no eligible events remain. It also verifies the remaining count. If records are locked by another request, it reports that cleanup should be run again.

The same method is available in code:

```js
import { cleanupExpiredEvents } from './scripts/cleanup.mjs';
await cleanupExpiredEvents((query, params) => database.query(query, params));
```

The callback must return an array of rows. The method is never called by a visitor request or a timer. Database credentials must stay out of source, browser code, and command arguments.

## What Gets Deleted

An event is eligible only when its one-year creation anniversary has passed. Cleanup uses creation age, regardless of the stored expiry.

Foreign keys remove the event’s possible dates, responses, and availability in the same transaction. A newer response belonging to an old event is removed with that event. Younger events and their data remain intact. Provider backups and logs follow their own retention policies.

## Database Change

Apply `007_shared_events.sql` and `008_manual_cleanup_by_age.sql` with the normal migration runner. It extends all existing event deadlines from one month to one year, removes the participant-limit check, and updates the bounded cleanup function. It does not run cleanup or delete event data.

The previous ChatGPT cleanup task is disabled. The unfinished Cloudflare scheduler is not used. Hosting remains on ChatGPT Sites and Neon.
