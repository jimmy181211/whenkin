import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createApp as apiApp,
  type AppOptions,
} from '../App/backend/app';
import { testClient } from './test-client';

const createApp = (db: Database, options: AppOptions = {}) =>
  testClient(apiApp(db, options));

import { createWebApp as webApp } from '../App/backend/web';

const createWebApp = (
  db: Database,
  options: AppOptions & { staticRoot: string },
) => testClient(webApp(db, options));

import { pageRoute } from '../App/shared/routes';
import type { Database } from '../App/backend/db/types';

const database: Database = { query: async () => [] };
let root: string;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'whenkin-web-'));
  await mkdir(join(root, 'assets'));
  await writeFile(
    join(root, 'index.html'),
    '<!doctype html><link rel="manifest" href="/site.webmanifest"><div id="root">Whenkin</div>',
  );
  await writeFile(
    join(root, 'assets', 'app-hash.js'),
    'console.log("Whenkin")',
  );
});
afterAll(async () => {
  await rm(root, { recursive: true });
});

describe('Node server and browser routes', () => {
  it('serves direct page links and refreshes, including an event UUID', async () => {
    const app = createWebApp(database, { staticRoot: root });
    for (const path of [
      '/',
      '/terms',
      '/privacy',
      '/how-it-works',
      '/terms/',
      '/privacy/',
      '/how-it-works/',
      '/e/855e5518-3b5a-49cb-b906-69bbd7bac603',
    ]) {
      const response = await app.request('http://localhost' + path);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('id="root"');
    }
    for (const path of [
      '/demo',
      '/e/not-an-id',
    ]) {
      expect((await app.request('http://localhost' + path)).status).toBe(404);
      expect(pageRoute(path).kind).toBe('not-found');
    }
  });
  it('keeps assets, missing API endpoints, and HTML fallbacks separate', async () => {
    const app = createWebApp(database, { staticRoot: root });
    const asset = await app.request('http://localhost/assets/app-hash.js');
    expect(asset.status).toBe(200);
    expect(asset.headers.get('Cache-Control')).toContain('immutable');
    expect(
      (await app.request('http://localhost/assets/missing.js')).status,
    ).toBe(404);
    const missing = await app.request('http://localhost/api/missing');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('Content-Type')).toContain('application/json');
    expect(missing.headers.get('Cache-Control')).toBe('no-store');
  });
  it('serves page-specific launch metadata without querying the database', async () => {
    const app = createWebApp(
      {
        query: async () => {
          throw Error('manifest must not query the database');
        },
      },
      { staticRoot: root },
    );
    const path = '/e/855e5518-3b5a-49cb-b906-69bbd7bac603';
    const document = await (
      await app.request('http://localhost' + path)
    ).text();
    expect(document).toContain(
      '/site.webmanifest?page=' + encodeURIComponent(path),
    );
    const response = await app.request(
      'http://localhost/site.webmanifest?page=' + encodeURIComponent(path),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain(
      'application/manifest+json',
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({
      id: path,
      start_url: path,
      display: 'standalone',
    });
  });
  it('checks the public HTTPS origin behind a reverse proxy', async () => {
    const app = createApp(database, {
      publicOrigin: 'https://whenkin.example',
    });

    const request = (origin: string) =>
      app.request('http://app:3000/api/events', {
        method: 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

    expect((await request('https://whenkin.example')).status).toBe(400);
    expect((await request('https://another.example')).status).toBe(403);
  });
  it('preserves the write limiter and scopes it to the server-supplied IP', async () => {
    const app = createApp(database, { trustProxy: true });
    for (let i = 0; i < 30; i++) {
      expect(
        (
          await app.request(
            'http://localhost/api/events',
            {
              method: 'POST',
              body: '{}',
            },
            { clientIp: 'client-one' },
          )
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await app.request(
          'http://localhost/api/events',
          {
            method: 'POST',
            body: '{}',
          },
          { clientIp: 'client-one' },
        )
      ).status,
    ).toBe(429);
    expect(
      (
        await app.request(
          'http://localhost/api/events',
          {
            method: 'POST',
            body: '{}',
          },
          { clientIp: 'client-two' },
        )
      ).status,
    ).toBe(400);
    expect((await app.request('http://localhost/api/health')).status).toBe(200);
  });
  it('reports an unavailable database without leaking connection details', async () => {
    const app = createApp({
      query: async () => {
        throw new Error('private-database-details');
      },
    });
    expect(
      await (await app.request('http://localhost/api/health')).json(),
    ).toEqual({ ready: false });
    const response = await app.request(
      'http://localhost/api/events/855e5518-3b5a-49cb-b906-69bbd7bac603',
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-database-details');
  });
});
