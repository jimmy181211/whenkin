/** Checks pool ownership without opening a network connection or reading production data. */
import { afterEach, expect, it, vi } from 'vitest';
import { PostgresDatabase } from '../App/backend/db/connection.js';

/** Supply a separate fake pool for each database instance. */
const { Pool } = vi.hoisted(() => ({
  /** Return driver operations that can be observed without a PostgreSQL server. */
  Pool: vi.fn(function () {
    return { query: vi.fn(), connect: vi.fn(), end: vi.fn(), on: vi.fn() };
  }),
}));

/** Replace only the driver; exercise the actual database class. */
vi.mock('pg', () => ({ Pool }));

/** Restore environment overrides and discard each test's pool call history. */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

/** Query rows, transaction checkout, and shutdown must all use the owned pool. */
it('preserves pool settings and delegates operations to the same pool', async () => {
  const database = new PostgresDatabase('postgresql://fixture/whenkin');
  const pool = Pool.mock.results[0].value;
  const rows = [{ id: 'saved' }];
  const client = { release: vi.fn() };
  pool.query.mockResolvedValue({ rows });
  pool.connect.mockResolvedValue(client);
  pool.end.mockResolvedValue(undefined);
  expect(Pool).toHaveBeenCalledWith({
    connectionString: 'postgresql://fixture/whenkin',
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    query_timeout: 15000,
    options: '-c timezone=UTC',
  });
  expect(pool.query).not.toHaveBeenCalled();
  expect(await database.query('SELECT $1 AS id', ['saved'])).toBe(rows);
  expect(pool.query).toHaveBeenCalledWith('SELECT $1 AS id', ['saved']);
  expect(await database.connect()).toBe(client);
  await database.close();
  expect(pool.end).toHaveBeenCalledOnce();
});

/** Separate commands must own separate pools, and query failures must still reject. */
it('isolates instances and preserves driver failures', async () => {
  const first = new PostgresDatabase('postgresql://fixture/first');
  const second = new PostgresDatabase('postgresql://fixture/second');
  const firstPool = Pool.mock.results[0].value;
  const secondPool = Pool.mock.results[1].value;
  const failure = new Error('Fixture query failed');
  firstPool.query.mockRejectedValue(failure);
  await expect(first.query('SELECT 1')).rejects.toBe(failure);
  expect(firstPool.query).toHaveBeenCalledWith('SELECT 1', []);
  expect(secondPool.query).not.toHaveBeenCalled();
  await first.close();
  expect(secondPool.end).not.toHaveBeenCalled();
  await second.close();
});

/** Invalid settings must fail before pool creation; environment configuration stays supported. */
it('validates connection settings before creating a pool', async () => {
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('PGHOST', '');
  expect(() => new PostgresDatabase()).toThrow('Set DATABASE_URL');
  expect(Pool).not.toHaveBeenCalled();
  vi.stubEnv('PGHOST', 'fixture-host');
  const database = new PostgresDatabase();
  expect(Pool).toHaveBeenCalledOnce();
  await database.close();
});
