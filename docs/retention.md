# Event Retention

## Rules

- All links for an event expire one calendar month after its creation, calculated in UTC. Both calendar modes use this rule, including events whose proposed dates are further in the future.
- There are at most 1,000 saved participant responses per event. Empty responses count. Updates do not count twice.
- The API returns HTTP 410 for an expired event while its row still exists, then HTTP 404 after deletion. Both messages explain that the event has expired or may have expired.
- A daily cleanup removes expired events and all their dates, responses, and availability. Events become inaccessible at expiry even if a cleanup run is delayed. Provider history, backups, and logs follow their separate retention processes.

## Setup

Run `npm run db:migrate` with a server-only database connection. The migration runner preserves SQL function bodies and commits each migration with its checksum. Never change an already-applied migration.

Production uses the existing Whenkin Neon project (`gentle-thunder-71894819`), production branch (`br-rapid-mode-ar9ly6x2`), database `whenkin`. The temporary validation branch has an automatic expiry and is not a production scheduler target.

The linked Sites automation **Clean Expired Whenkin Events** runs every day at **03:15 UTC**. It uses the connected Neon account, rather than an unauthenticated website route. No credentials belong in the schedule instructions or this repository.

## Cleanup Operation

Use the connected Neon account with the production project, branch, and database above:

```sql
SELECT * FROM public.purge_expired_events(100);
```

Repeat until `deleted_events` is zero. Each call commits a small batch independently, so a failed run can safely resume. The function can only select expired events. Its batch size is clamped to 1–1,000, and locked events are skipped for the next run. The function runs with the caller's database privileges; execution is revoked from PUBLIC.

Read back the number of expired events after cleanup:

```sql
SELECT count(*)::integer AS remaining_expired_events
FROM public.events WHERE expires_at <= statement_timestamp();
```

No schema changes or website deployment are needed for routine cleanup. If a run fails, check the connected Neon account and the linked schedule, then retry the same bounded operation. Keep one enabled cleanup schedule rather than creating duplicates. Check its enabled status when transferring ownership or changing the hosting/database connection.

## Verification

The API tests cover fixed month-end expiry, all link types, writes racing expiry, the 1,000-response boundary, updates at capacity, cascade deletion, and bounded repeated cleanup. The migration was also tested on a separate Neon branch with simultaneous requests for the last participant place.
