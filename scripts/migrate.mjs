import { neon } from '@neondatabase/serverless';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL in your environment before running migrations. Never commit it.');
  process.exit(1);
}
try {
  const sql = neon(process.env.DATABASE_URL);
  await sql.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of (await readdir(new URL('../migrations/', import.meta.url))).filter(n=>n.endsWith('.sql')).sort()) {
    const contents = await readFile(new URL('../migrations/'+name, import.meta.url),'utf8');
    const checksum = createHash('sha256').update(contents).digest('hex');
    const existing = await sql.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
    if (existing.length) {
      if (existing[0].checksum!==checksum) throw new Error('A previously applied migration changed.');
      console.log('Already applied: '+name); continue;
    }
    // This initial schema is idempotent. Each statement and the ledger entry commit together.
    const statements=contents.split(';').map(s=>s.trim()).filter(Boolean);
    await sql.transaction([...statements.map(s=>sql.query(s)),sql.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum])]);
    console.log('Applied: '+name);
  }
} catch {
  console.error('Migration failed. Check database access and migration history. No credentials were printed.');
  process.exit(1);
}
