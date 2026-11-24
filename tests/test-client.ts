import { afterAll } from 'vitest';
import type { Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const servers: Server[] = [];
afterAll(
  /* Close all localhost test servers after the suites finish. */
  async () => {
    await Promise.all(
      servers.map(
        /** Start asynchronous shutdown for each tracked test server. */
        (server) =>
          new Promise<void>(
            /* Close the server and its idle connections before resolving cleanup. */
            (resolve, reject) => {
              server.close(
                /* Resolve successful server shutdown or propagate its error. */
                (error) => (error ? reject(error) : resolve()),
              );
              server.closeIdleConnections();
            },
          ),
      ),
    );
  },
);

/**
 * Start an ephemeral localhost server and return a fetch-style test
 * client.
 * @returns A fetch-style request client; its local server is registered for suite cleanup.
 */
export function testClient(app: Express) {
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  const ready = new Promise<void>(
    /* Wait until the fixture server is listening, or reject its startup error. */
    (resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    },
  );
  return {
    /**
     * Forward a test request to the fixture server after startup is complete.
     * @returns The fetch response after the server is ready; startup and transport failures reject.
     */
    async request(input: string, init: RequestInit = {}, env: { clientIp?: string } = {}) {
      await ready;
      const requested = new URL(input);
      const address = server.address() as AddressInfo;
      const headers = new Headers(init.headers);
      if (env.clientIp) {
        headers.set('X-Forwarded-For', env.clientIp);
      }
      return fetch(`http://127.0.0.1:${address.port}${requested.pathname}${requested.search}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(10000),
      });
    },
  };
}
