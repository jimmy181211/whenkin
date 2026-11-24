import { PostgresDatabase } from './db/connection.js';
import { createWebApp } from './web.js';

const database = new PostgresDatabase();
const app = createWebApp(database, {
  publicOrigin: process.env.PUBLIC_ORIGIN,
  trustProxy: process.env.TRUST_PROXY === 'true',
});
const port = Number(process.env.PORT || process.env.API_PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be between 1 and 65535.');
}
const server = app.listen(
  port,
  host,
  /* Print the local URL once the HTTP server is listening. */
  () => console.log('Whenkin is running at http://' + host + ':' + port),
);

/**
 * Stop accepting requests, close the database, and enforce a shutdown
 * deadline.
 */
function shutdown() {
  server.close(
    /* Close the pool after outstanding HTTP connections finish. */
    () => {
      void database.close().then(
        /* Exit successfully after the pool has closed. */
        () => process.exit(0),
      );
    },
  );
  setTimeout(
    /* Exit with failure if graceful shutdown exceeds ten seconds. */
    () => process.exit(1),
    10000,
  ).unref();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
