import { neon } from '@neondatabase/serverless';
import { pathToFileURL } from 'node:url';

// Manual entry point, also importable by maintenance code. No scheduler or timer.
export async function cleanupExpiredEvents(query) {
  let deletedEvents = 0;
  while (true) {
    const rows = await query('SELECT * FROM public.purge_expired_events($1)', [100]);
    const count = rows[0]?.deleted_events;
    if (!Number.isInteger(count) || count < 0 || count > 100) throw new Error('Invalid cleanup result.');
    deletedEvents += count;
    if (count === 0) break;
  }
  const rows = await query('SELECT count(*)::integer AS remaining FROM public.events WHERE (((created_at AT TIME ZONE \'UTC\')+interval \'1 year\') AT TIME ZONE \'UTC\')<=statement_timestamp()');
  if (rows[0]?.remaining !== 0) throw new Error('Some old events are busy. Run cleanup again.');
  return { deletedEvents };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.DATABASE_URL) throw new Error('Missing connection.');
    const sql = neon(process.env.DATABASE_URL);
    if (process.argv.includes('--dry-run')) {
      const rows = await sql.query('SELECT count(*)::integer AS eligible_events FROM events WHERE (((created_at AT TIME ZONE \'UTC\')+interval \'1 year\') AT TIME ZONE \'UTC\')<=statement_timestamp()');
      console.log(JSON.stringify(rows[0]));
    } else {
      console.log(JSON.stringify(await cleanupExpiredEvents((query, params) => sql.query(query, params))));
    }
  } catch {
    console.error('Cleanup did not finish. Check DATABASE_URL and migration 007, then retry. No credentials were printed.');
    process.exitCode = 1;
  }
}
