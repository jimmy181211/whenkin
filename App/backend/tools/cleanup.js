/** Validates the retention policy and performs administrator-requested cleanup. */
import { createDatabase } from '../db/connection.js';
import { pathToFileURL } from 'node:url';
import {
  parseRetentionPolicy,
  validateRetentionMonths,
} from '../../shared/retention.js';

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
    throw new Error(
      'Use --dry-run and/or --months followed by a positive whole number.',
    );
  }
  return {
    months,
    dryRun,
  };
}

// Manual maintenance only. No visitor endpoint, scheduler, or constructor side effects.
export class EventCleanup {
  #query;

  #time;

  /** Accept months; validation has no database side effects. */
  constructor(query, time = 12) {
    this.#query = query;
    this.#time = validateRetentionMonths(time);
  }

  /** Load the persisted administrator policy. */
  static async load(query) {
    const rows = await query(
      'SELECT * FROM public.get_event_retention_policy()',
    );
    const policy = parseRetentionPolicy(rows[0]);
    return new EventCleanup(query, policy.value);
  }

  /** Return the configured number of months. */
  getTime() {
    return this.#time;
  }

  /** Persist a duration and recalculate deadlines without deleting rows. */
  async setTime(time) {
    const months = validateRetentionMonths(time);
    const rows = await this.#query(
      'SELECT * FROM public.set_event_retention_months($1)',
      [months],
    );
    const policy = parseRetentionPolicy(rows[0]);
    if (policy.value !== months) {
      throw new Error('Retention update did not match the requested months.');
    }
    this.#time = policy.value;
  }

  /** Count eligible event rows without changing the policy or data. */
  async dryRun() {
    const rows = await this.#query(
      'SELECT count(*)::integer AS eligible_events FROM public.events WHERE public.event_retention_deadline(created_at,$1)<=statement_timestamp()',
      [this.#time],
    );
    return {
      months: this.#time,
      eligibleEvents: rows[0]?.eligible_events,
    };
  }

  /** Apply the chosen policy, then delete expired rows in bounded batches. */
  async run() {
    const active = await EventCleanup.load(this.#query);
    if (active.getTime() !== this.#time) {
      await this.setTime(this.#time);
    }
    let deletedEvents = 0;
    while (true) {
      const rows = await this.#query(
        'SELECT * FROM public.purge_expired_events($1)',
        [100],
      );
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
      'SELECT count(*)::integer AS remaining FROM public.events WHERE public.event_retention_deadline(created_at)<=statement_timestamp()',
    );
    if (rows[0]?.remaining !== 0) {
      throw new Error('Some old events are busy. Run cleanup again.');
    }
    return { deletedEvents };
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  let database;
  try {
    const options = cleanupOptions(process.argv.slice(2));
    database = createDatabase();

    const query = (sql, params) => database.query(sql, params);

    const cleanup =
      options.months === undefined
        ? await EventCleanup.load(query)
        : new EventCleanup(query, options.months);
    console.log(
      JSON.stringify(await (options.dryRun ? cleanup.dryRun() : cleanup.run())),
    );
  } catch {
    console.error(
      'Cleanup did not finish. Check DATABASE_URL, migrations through 009, and the whole-number months parameter. No credentials were printed.',
    );
    process.exitCode = 1;
  } finally {
    await database?.close();
  }
}
