/** Validates the retention policy and performs administrator-requested cleanup. */
import { PostgresDatabase } from '../db/connection.js';
import { pathToFileURL } from 'node:url';
import {
  parseRetentionPolicy,
  validateRetentionMonths,
} from '../../shared/retention.js';

/**
 * Parse --months and --dry-run without opening a database connection.
 * Omitted months means load the saved policy; dry-run never persists a new policy.
 * @returns The optional month override and whether this invocation only previews deletion.
 */
export function cleanupOptions(args) {
  let months;
  let dryRun = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--') {
      continue;
    }
    if (argument === '--dry-run' && !dryRun) {
      dryRun = true;
      continue;
    }
    if (
      argument === '--months' &&
      months === undefined &&
      /^[1-9]\d*$/.test(args[index + 1] || '')
    ) {
      months = validateRetentionMonths(Number(args[++index]));
      continue;
    }
    throw new Error('Use --dry-run and/or --months followed by a positive whole number.');
  }
  return {
    months,
    dryRun,
  };
}

/** Run administrator-requested cleanup; constructing this class changes no data. */
export class EventCleanup {
  #query;

  // Calendar months to retain, not days, milliseconds, or the cleanup batch size.
  #time;

  /**
   * Keep the query function and validate a duration without changing database data.
   * @param time - Whole calendar months to retain; defaults to 12 for a new instance.
   */
  constructor(query, time = 12) {
    this.#query = query;
    this.#time = validateRetentionMonths(time);
  }

  /**
   * Load the persisted administrator policy without changing it.
   * @returns A cleanup instance using the validated month count read from the database.
   */
  static async load(query) {
    const rows = await query('SELECT * FROM public.get_event_retention_policy()');
    const policy = parseRetentionPolicy(rows[0]);
    return new EventCleanup(query, policy.value);
  }

  /** @returns This instance's configured retention duration in whole calendar months. */
  getTime() {
    return this.#time;
  }

  /**
   * Save a month count and let the database recalculate existing event deadlines.
   * This changes the shared policy shown by the frontend but does not delete rows.
   * A failure after the write does not roll back an already persisted policy change.
   */
  async setTime(time) {
    const months = validateRetentionMonths(time);
    const rows = await this.#query('SELECT * FROM public.set_event_retention_months($1)', [months]);
    const policy = parseRetentionPolicy(rows[0]);
    if (policy.value !== months) {
      throw new Error('Retention update did not match the requested months.');
    }
    this.#time = policy.value;
  }

  /**
   * Count event rows that would expire under this instance's month count.
   * @returns The tested duration and eligible event count, without changing any data.
   */
  async dryRun() {
    const rows = await this.#query(
      `SELECT count(*)::integer AS eligible_events FROM public.events WHERE
  public.event_retention_deadline(created_at , $1)<=statement_timestamp()`,
      [this.#time],
    );
    return {
      months: this.#time,
      eligibleEvents: rows[0]?.eligible_events,
    };
  }

  /**
   * Persist the chosen policy if needed, then delete expired events in batches.
   * Verify that no eligible events remain; busy rows require a later retry.
   * Earlier policy changes and deletion batches remain committed if a later step fails.
   * @returns A result whose deletedEvents counts event rows, not cascaded child rows.
   */
  async run() {
    // The saved policy may differ from a duration passed to this cleanup instance.
    const active = await EventCleanup.load(this.#query);
    if (active.getTime() !== this.#time) {
      await this.setTime(this.#time);
    }
    // Counts event rows only. Foreign keys also remove their replies and time ranges.
    let deletedEvents = 0;
    while (true) {
      const rows = await this.#query('SELECT * FROM public.purge_expired_events($1)', [100]);
      const count = rows[0]?.deleted_events;
      if (!Number.isInteger(count) || count < 0 || count > 100) {
        throw new Error('Invalid cleanup result.');
      }
      deletedEvents += count;
      if (count === 0) {
        break;
      }
    }
    const rows = await this.#query(
      `SELECT count(*)::integer AS remaining FROM public.events WHERE
  public.event_retention_deadline(created_at)<=statement_timestamp()`,
    );
    if (rows[0]?.remaining !== 0) {
      throw new Error('Some old events are busy. Run cleanup again.');
    }
    return { deletedEvents };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let database;
  try {
    const options = cleanupOptions(process.argv.slice(2));
    database = new PostgresDatabase();

    /**
     * Pass cleanup SQL and bound values to the database adapter.
     * @returns The query's result rows after the database operation completes.
     */
    const query = (sql, params) => database.query(sql, params);

    const cleanup =
      options.months === undefined
        ? await EventCleanup.load(query)
        : new EventCleanup(query, options.months);
    console.log(JSON.stringify(await (options.dryRun ? cleanup.dryRun() : cleanup.run())));
  } catch {
    console.error(
      'Cleanup did not finish. Check DATABASE_URL, migrations through ' +
        '009, and the whole-number months parameter. No credentials were ' +
        'printed.',
    );
    process.exitCode = 1;
  } finally {
    await database?.close();
  }
}
