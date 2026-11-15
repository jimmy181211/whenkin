import { createDatabase } from './db/connection.mjs';
import { createWebApp } from './web.js';

const database = createDatabase();
const app = createWebApp(database, {
  publicOrigin: process.env.PUBLIC_ORIGIN,
  trustProxy: process.env.TRUST_PROXY === 'true',
});
const port = Number(process.env.PORT || process.env.API_PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const server = app.listen(port, host, () => console.log('Whenkin is running at http://' + host + ':' + port));

function shutdown() {
  server.close(() => { void database.close().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
