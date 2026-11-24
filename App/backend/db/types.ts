/** Shared query interface for the Node pool, hosted adapter, and test databases. */
export type Database = {
  /**
   * Execute SQL with bound values.
   * @returns Result rows after execution, rather than driver connection or status metadata.
   */
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
};
