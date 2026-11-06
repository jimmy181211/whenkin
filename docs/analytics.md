# Local analysis and retention verification

These tools run manually. They do not add tracking, browser analytics, a public
dashboard, or database schema changes to Whenkin.

## Read-only analysis

With the owner's authorization, use the server-only `DATABASE_URL` and run:

```sh
node scripts/analyze-events.mjs --output outputs/analytics
```

The query in `scripts/analytics-extract.sql` computes statistics inside PostgreSQL
in one consistent statement. It exports event titles for topic classification,
anonymous event-level statistics, overall time-zone counts, and aggregated free
time histograms. Names, event links, response IDs, personal ranges, and exact
creation timestamps are not exported. Generated data belongs in ignored local
`outputs/`, never in a public deployment or GitHub.

An already authorized snapshot can be processed offline:

```sh
node scripts/analyze-events.mjs --input outputs/analytics/snapshot.json --output outputs/analytics
```

Outputs: `analysis.html`, `events.csv`, and `summary.json`. The HTML is standalone
and includes scatter plots, missing-value lanes, topic filtering, personal free
time rate heatmaps, shared-time heatmaps and the complete event metrics table.
The CSV writes missing values as `NULL`. No records are automatically excluded.

Topic labels are explicit keyword matches, not inferred personal identities.
The SQL rules and matched title words are exposed for review. Unknown titles stay
unclassified. Multiple labels can apply to one event. A campus-related event does
not prove its responders are college students. Each result reports its sample
size. Statistical outlier flags use 1.5×IQR and never remove data.

Personal availability rates divide marked-free minutes by offered minutes for
responders who submitted a response. They describe choices among the offered
windows, not real-world availability outside those windows. Histograms support
both the responder's selected zone and the event zone. Weekday polls use the
same creation-time offset reference as the application. Dates and recurring
weekdays are separated. Shared time is the exact intersection of every saved
response and the union of event windows; duplicates do not count people twice.

No responses means shared duration is unknown (`NULL`); with responses but no
intersection it is measured zero. Weekday polls have no actual lead date.
Creation identity, physical location and first-response timestamps were not
recorded and stay `NULL`; `updated_at` must not be substituted. Report single-
response events separately from genuinely multi-response coordination.

## Reproducible cleanup evidence

```sh
node scripts/verify-retention.mjs outputs/retention-verification
```

This uses disposable in-memory PGlite PostgreSQL, never `DATABASE_URL`. It loads
the real migrations and manual cleanup runner, freezes the test clock, and
tests the original one-calendar-year policy and a ten-day test-only policy.
Production still uses one year and manual cleanup.

Each scenario creates 210 events, 420 windows, 420 responses, and 840 availability
records. It independently computes the expected deletion set, verifies complete
identity sets rather than just counts, checks byte-equivalent retained rows,
cascades, orphan counts, multiple batches, exact age boundaries and a boundary
one millisecond newer. It checks past-expiry young events, future-expiry old
events, idempotence and leap-year calendar arithmetic. JSON and HTML evidence
record the actual outcome. This proves the tested SQL behavior, not the existence
or execution of an automatic scheduler; the site has no automatic cleanup job.
