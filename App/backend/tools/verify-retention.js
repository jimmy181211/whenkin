import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EventCleanup } from './cleanup.js';

// Isolated synthetic data only. This program never reads DATABASE_URL.
const output = resolve(process.argv[2] || 'outputs/retention-months-verification');
const pg = new PGlite();
const clock = '2026-11-05T12:00:00Z';

/**
 * Execute fixture SQL with the simulated clock substituted for current
 * time.
 * @returns The fixture query's rows after execution against the isolated database.
 */
const query = async (sql, params = []) =>
  (await pg.query(sql.replaceAll('statement_timestamp()', `'${clock}'::timestamptz`), params)).rows;

const report = {
  run_at: new Date().toISOString(),
  environment: 'isolated disposable PGlite; no production access',
  simulated_clock: clock,
  default_months: 12,
  scenarios: [],
};

/** Fail the retention verification with the supplied explanation. */
const check = (value, message) => {
  if (!value) {
    throw Error(message);
  }
};

try {
  for (const name of (await readdir(new URL('../db/migrations/', import.meta.url)))
    .filter(
      /* Select SQL migrations to prepare the isolated test database. */
      (name) => name.endsWith('.sql'),
    )
    .sort()) {
    await pg.exec(await readFile(new URL('../db/migrations/' + name, import.meta.url), 'utf8'));
  }
  const definition = (
    await query("SELECT pg_get_functiondef('purge_expired_events(integer)'::regprocedure) AS sql")
  )[0].sql;
  await pg.exec(definition.replaceAll('statement_timestamp()', `'${clock}'::timestamptz`));
  for (const months of [1, 2, 12]) {
    await pg.exec('TRUNCATE events CASCADE');
    const cleanup = new EventCleanup(query);
    check(cleanup.getTime() === 12, 'Constructor default changed');
    await cleanup.setTime(months);
    await query(
      `INSERT INTO events(id, title, organizer_name, timezone)
SELECT gen_random_uuid(), 'Fixture ' || n, '', 'UTC'
FROM generate_series(1, 210) n`,
    );
    await query(
      `INSERT INTO event_windows(event_id, starts_at, ends_at)
SELECT id,
  '2027-01-15 09:00Z'::timestamptz + n * interval '2 hours',
  '2027-01-15 10:00Z'::timestamptz + n * interval '2 hours'
FROM events CROSS JOIN generate_series(0, 1) n`,
    );
    await query(
      `INSERT INTO responses(id, event_id, name, timezone, edit_hash)
SELECT gen_random_uuid(), id, 'Synthetic responder', 'UTC', ''
FROM events CROSS JOIN generate_series(1, 2)`,
    );
    await query(
      `INSERT INTO availability(response_id, starts_at, ends_at)
SELECT id,
  '2027-01-15 09:00Z'::timestamptz + n * interval '2 hours',
  '2027-01-15 10:00Z'::timestamptz + n * interval '2 hours'
FROM responses CROSS JOIN generate_series(0, 1) n`,
    );
    await query(
      `UPDATE events
SET created_at='${clock}'::timestamptz-make_interval(months=>$1)-interval '1 second',
    expires_at='${clock}'::timestamptz-interval '1 second'`,
      [months],
    );
    const fixtures = [
      [
        'Fixture 206',
        `'${clock}'::timestamptz-make_interval(months=>$1)`,
        `'${clock}'::timestamptz`,
      ],
      [
        'Fixture 207',
        `'${clock}'::timestamptz-make_interval(months=>$1)+interval '1 millisecond'`,
        `'${clock}'::timestamptz+interval '1 millisecond'`,
      ],
      [
        'Fixture 208',
        `'${clock}'::timestamptz+make_interval(months=>$1)*0`,
        `'${clock}'::timestamptz+interval '1 year'`,
      ],
      [
        'Fixture 209',
        `'${clock}'::timestamptz+make_interval(months=>$1)*0`,
        `'${clock}'::timestamptz-interval '1 day'`,
      ],
      [
        'Fixture 210',
        `'${clock}'::timestamptz-make_interval(months=>$1)-interval '1 day'`,
        `'${clock}'::timestamptz+interval '1 year'`,
      ],
    ];
    for (const [name, created, expiry] of fixtures) {
      await query(`UPDATE events SET created_at=${created},expires_at=${expiry} WHERE title=$2`, [
        months,
        name,
      ]);
    }

    /**
     * Capture every fixture table so deletion and retention can be compared
     * exactly.
     * @returns Table names mapped to their rows in stable id order.
     */
    const snapshot = async () =>
      Object.fromEntries(
        await Promise.all(
          ['events', 'event_windows', 'responses', 'availability'].map(
            /** Read a fixture table in stable id order for the before/after comparison. */
            async (table) => [table, await query(`SELECT * FROM ${table} ORDER BY id`)],
          ),
        ),
      );

    const before = await snapshot();
    const expected = new Set(
      before.events
        .filter(
          /** Select fixture events expected to expire at the simulated deadline. */
          (row) => Number(row.title.slice(8)) <= 206 || row.title === 'Fixture 210',
        )
        .map(/* Collect the ids expected to be removed. */ (row) => row.id),
    );
    check((await cleanup.dryRun()).eligibleEvents === 207, 'Dry run count mismatch');
    const batches = [];

    /**
     * Run cleanup SQL and record each reported deletion batch.
     * @returns The query result rows used by the cleanup instance under test.
     */
    const execute = async (sql, params) => {
      const rows = await query(sql, params);
      if (sql.includes('purge_expired_events')) {
        batches.push(rows[0].deleted_events);
      }
      return rows;
    };

    const result = await (await EventCleanup.load(execute)).run();
    const after = await snapshot();
    const actual = new Set(
      before.events
        .filter(
          /* Find fixture events missing from the post-cleanup snapshot. */
          (row) =>
            !after.events.some(
              /* Check whether this original event still exists after cleanup. */
              (kept) => kept.id === row.id,
            ),
        )
        .map(
          /* Collect the ids actually removed by cleanup. */
          (row) => row.id,
        ),
    );
    check(
      result.deletedEvents === 207 &&
        actual.size === expected.size &&
        [...actual].every(
          /* Check that every actual deletion was expected. */
          (id) => expected.has(id),
        ),
      'Missing or excessive deletions',
    );
    const responses = new Set(
      before.responses
        .filter(
          /* Select replies belonging to events that should be retained. */
          (row) => !expected.has(row.event_id),
        )
        .map(
          /* Collect the ids of replies expected to remain. */
          (row) => row.id,
        ),
    );
    const kept = {
      events: before.events.filter(
        /* Build the expected retained-event snapshot. */
        (row) => !expected.has(row.id),
      ),
      event_windows: before.event_windows.filter(
        /** Keep schedule windows belonging to retained events. */
        (row) => !expected.has(row.event_id),
      ),
      responses: before.responses.filter(
        /* Keep the replies expected to survive cleanup. */
        (row) => responses.has(row.id),
      ),
      availability: before.availability.filter(
        /* Keep time ranges belonging to those retained replies. */
        (row) => responses.has(row.response_id),
      ),
    };
    for (const table of Object.keys(kept)) {
      check(
        JSON.stringify(kept[table]) === JSON.stringify(after[table]),
        table + ' preserved data changed',
      );
    }
    check((await cleanup.run()).deletedEvents === 0, 'Second cleanup must be idempotent');
    report.scenarios.push({
      months,
      status: 'PASS',
      expected_deleted_event_rows: 207,
      actual_deleted_event_rows: result.deletedEvents,
      missing_deletions: 0,
      excess_deletions: 0,
      batches,
      preserved_rows_unchanged: true,
      exact_deadline_deleted: true,
      plus_one_millisecond_preserved: true,
      second_cleanup_deleted_rows: 0,
      before: Object.fromEntries(
        Object.entries(before).map(
          /* Record each fixture table's row count before cleanup. */
          ([key, rows]) => [key, rows.length],
        ),
      ),
      after: Object.fromEntries(
        Object.entries(after).map(
          /* Record the corresponding row counts after cleanup. */
          ([key, rows]) => [key, rows.length],
        ),
      ),
    });
  }
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = error.message;
  process.exitCode = 1;
} finally {
  await pg.close();
}
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'retention-evidence.json'), JSON.stringify(report, null, 2));
await writeFile(
  resolve(output, 'retention-evidence.html'),
  /* HTML */ `<!doctype html><meta charset="utf-8" /><title>
      Whenkin 清理验证</title
    ><style>
      body {
        font: 16px system-ui;
        max-width: 960px;
        margin: 40px auto;
        padding: 20px;
        color: #183d35;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border: 1px solid #dce5dc;
        padding: 12px;
        text-align: left;
      }
    </style>
    <h1>按月配置的清理验证：${report.status}</h1>
    <p>
      测试时间（人为模拟）：${clock}。仅使用本地合成数据，正式数据库未修改。
    </p>
    <table>
      <tr>
        <th>保留期限</th>
        <th>应删除活动行</th>
        <th>实际删除活动行</th>
        <th>漏删行</th>
        <th>误删行</th>
      </tr>
      ${report.scenarios
        .map(
          /* Render each retention scenario's expected and actual deletion counts. */
          (row) => /* HTML */ `<tr>
              <td>${row.months} 个月</td>
              <td>${row.expected_deleted_event_rows}</td>
              <td>${row.actual_deleted_event_rows}</td>
              <td>${row.missing_deletions}</td>
              <td>${row.excess_deletions}</td>
            </tr>`,
        )
        .join('')}
    </table>
    <p>
      通过项同时验证关联记录清理、保留记录完整、到期边界，以及重复运行不再删除数据。
    </p>`,
);
console.log(JSON.stringify(report, null, 2));
