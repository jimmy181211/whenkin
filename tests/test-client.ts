import { afterAll } from 'vitest';
import type { Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const servers: Server[] = [];
afterAll(async () => {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeIdleConnections();
        }),
    ),
  );
});

export function testClient(app: Express) {
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  const ready = new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  return {
    async request(
      input: string,
      init: RequestInit = {},
      env: { clientIp?: string } = {},
    ) {
      await ready;
      const requested = new URL(input);
      const address = server.address() as AddressInfo;
      const headers = new Headers(init.headers);
      if (env.clientIp) {
        headers.set('X-Forwarded-For', env.clientIp);
      }
      return fetch(
        `http://127.0.0.1:${address.port}${requested.pathname}${requested.search}`,
        {
          ...init,
          headers,
          signal: AbortSignal.timeout(10000),
        },
      );
    },
  };
}
