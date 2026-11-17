// Exercise the built current-host artifact in workerd. No live database or network access.
import { Miniflare } from 'miniflare';
import { PGlite } from '@electric-sql/pglite';
import {
  readFile,
  readdir,
} from 'node:fs/promises';
import assert from 'node:assert/strict';

const configuration = JSON.parse(await readFile('wrangler.json', 'utf8'));
// Sites can apply canonical HTML redirects even when local Wrangler disables them.
for (const mode of new Set([
  configuration.assets.html_handling,
  'auto-trailing-slash',
])) {
  await checkRuntime(mode);
}

async function checkRuntime(htmlHandling) {
  const pg = new PGlite();
  for (const file of (await readdir('App/backend/db/migrations')).sort()) {
    await pg.exec(await readFile('App/backend/db/migrations/' + file, 'utf8'));
  }
  const mf = new Miniflare({
    name: 'whenkin',
    modules: true,
    scriptPath: 'dist/server/index.js',
    compatibilityDate: configuration.compatibility_date,
    compatibilityFlags: configuration.compatibility_flags,
    bindings: {
      DATABASE_URL: 'postgresql://test:test@database.neon.test/whenkin',
    },
    assets: {
      directory: configuration.assets.directory,
      binding: configuration.assets.binding,
      workerName: 'whenkin',
      routerConfig: {
        invoke_user_worker_ahead_of_assets:
          configuration.assets.run_worker_first,
        has_user_worker: true,
      },
      assetConfig: {
        html_handling: htmlHandling,
        not_found_handling: configuration.assets.not_found_handling,
      },
    },
    outboundService: async (request) => {
      assert.equal(new URL(request.url).hostname, 'api.neon.test');
      const {
        query,
        params,
      } = await request.json();
      try {
        const result = await pg.query(query, params);
        const fields = result.fields;
        const rows = result.rows.map((row) =>
          fields.map((field) => {
            const value = row[field.name];
            if (value === null || value === undefined) {
              return null;
            }
            if (typeof value === 'boolean') {
              return value ? 't' : 'f';
            }
            if (value instanceof Date) {
              return value.toISOString();
            }
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return String(value);
          }),
        );
        return Response.json({
          fields,
          rows,
          rowCount: rows.length,
          command: 'SELECT',
          rowAsArray: true,
        });
      } catch (error) {
        return Response.json(
          {
            message: error.message,
            code: error.code,
          },
          { status: 400 },
        );
      }
    },
  });
  try {
    const request = async (path, method = 'GET', body) => {
      const response = await mf.dispatchFetch('https://whenkin.test' + path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
          Origin: 'https://whenkin.test',
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '127.0.0.1',
        },
      });
      const text = await response.text();
      return {
        status: response.status,
        text,
        headers: response.headers,
        data: response.headers.get('content-type')?.includes('json')
          ? JSON.parse(text)
          : undefined,
      };
    };

    assert.equal((await request('/api/health')).data.ready, true);
    assert.deepEqual((await request('/api/retention')).data, {
      value: 12,
      unit: 'month',
    });
    assert.equal(
      (
        await request('/api/retention', 'PUT', {
          value: 2,
          unit: 'month',
        })
      ).status,
      404,
    );
    const date = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    const created = await request('/api/events', 'POST', {
      title: 'Sites compatibility test',
      timezone: 'UTC',
      dates: [date],
      startTime: '09:00',
      endTime: '10:00',
    });
    assert.equal(created.status, 201);
    const path = '/api/events/' + created.data.id;
    const event = (await request(path)).data;
    const alice = await request(path + '/responses', 'POST', {
      name: 'Alice',
      timezone: 'UTC',
      ranges: event.windows,
    });
    assert.equal(alice.status, 201);
    assert.equal((await request(path)).data.candidates.length, 1);
    const bob = await request(path + '/responses', 'POST', {
      name: 'Bob',
      timezone: 'UTC',
      ranges: [],
    });
    assert.equal(bob.status, 201);
    assert.equal((await request(path)).data.candidates.length, 0);
    const update = {
      name: 'Bob',
      timezone: 'UTC',
      ranges: event.windows,
      revision: bob.data.revision,
    };
    const saved = await request(
      path + '/responses/' + bob.data.id,
      'PUT',
      update,
    );
    assert.equal(saved.status, 200);
    assert.equal((await request(path)).data.candidates[0].available.length, 2);
    assert.equal(
      (await request(path + '/responses/' + bob.data.id, 'PUT', update)).status,
      409,
    );
    assert.equal(
      (
        await request(path + '/responses/' + bob.data.id, 'DELETE', {
          revision: saved.data.revision,
        })
      ).status,
      200,
    );
    assert.equal((await request(path)).data.responses.length, 1);
    assert.equal(
      (
        await request(path + '/responses/' + alice.data.id, 'DELETE', {
          revision: alice.data.revision,
        })
      ).status,
      200,
    );
    assert.equal((await request(path)).data.candidates.length, 0);
    const crossOrigin = await mf.dispatchFetch(
      'https://whenkin.test' + path + '/responses',
      {
        method: 'POST',
        headers: {
          Origin: 'https://other.test',
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
    );
    assert.equal(crossOrigin.status, 403);
    const malformed = await mf.dispatchFetch(
      'https://whenkin.test/api/events',
      {
        method: 'POST',
        headers: {
          Origin: 'https://whenkin.test',
          'Content-Type': 'application/json',
        },
        body: '{',
      },
    );
    assert.equal(malformed.status, 400);
    const oversized = await mf.dispatchFetch(
      'https://whenkin.test/api/events',
      {
        method: 'POST',
        headers: {
          Origin: 'https://whenkin.test',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'x'.repeat(131073) }),
      },
    );
    assert.equal(oversized.status, 413);
    await pg.query(
      "UPDATE events SET expires_at=now()-interval '1 second' WHERE id=$1",
      [created.data.id],
    );
    assert.equal((await request(path)).status, 410);
    for (const route of [
      '/',
      '/e/' + created.data.id,
      '/e/' + created.data.id + '/',
      '/how-it-works',
      '/terms',
      '/privacy',
    ]) {
      const page = await request(route);
      assert.equal(page.status, 200, route + ' in ' + htmlHandling);
      assert.match(
        page.text,
        /id="root"/,
        route + ' must contain the React document',
      );
      assert.match(page.headers.get('content-type') || '', /text\/html/);
      assert.equal(
        page.headers.get('location'),
        null,
        route + ' must not carry a canonical asset redirect',
      );
      const manifestLink = page.text.match(/href="(\/site\.webmanifest[^"]*)"/);
      assert.ok(manifestLink, 'page must declare its installation metadata');
      const launch = (await request(manifestLink[1])).data;
      assert.equal(launch.start_url, route.replace(/\/$/, '') || '/');
      assert.equal(launch.id, launch.start_url);
      assert.match(page.text, /href="\/apple-touch-icon\.png"/);
    }
    const manifest = await request('/site.webmanifest');
    assert.equal(manifest.status, 200);
    assert.equal(manifest.data.display, 'standalone');
    assert.equal(manifest.data.start_url, '/');
    assert.equal(manifest.data.icons.length, 2);
    assert.equal(
      (await request('/site.webmanifest?page=https%3A%2F%2Fother.test')).data
        .start_url,
      '/',
    );
    for (const [asset, size] of [
      [
        '/icon-192.png',
        192,
      ],
      [
        '/icon-512.png',
        512,
      ],
      [
        '/apple-touch-icon.png',
        180,
      ],
    ]) {
      const icon = await mf.dispatchFetch('https://whenkin.test' + asset);
      assert.equal(icon.status, 200);
      assert.match(icon.headers.get('content-type'), /^image\/png/);
      const bytes = Buffer.from(await icon.arrayBuffer());
      assert.deepEqual([...bytes.subarray(0, 4)], [
        137,
        80,
        78,
        71,
      ]);
      assert.equal(bytes.readUInt32BE(16), size);
      assert.equal(bytes.readUInt32BE(20), size);
    }
    const favicon = await mf.dispatchFetch('https://whenkin.test/favicon.ico');
    assert.equal(favicon.status, 200);
    assert.equal(Buffer.from(await favicon.arrayBuffer()).readUInt16LE(2), 1);
    assert.equal((await request('/e/not-an-id')).status, 404);
    assert.equal((await request('/api/missing')).status, 404);
    const missingAsset = await mf.dispatchFetch(
      'https://whenkin.test/assets/missing.js',
    );
    assert.equal(missingAsset.status, 404);
    assert.equal(missingAsset.headers.get('cache-control'), 'no-store');
    console.log(
      'PASS (' +
        htmlHandling +
        '): built Worker + Express; API endpoints, read-only monthly retention, common times, revision conflicts, expiry, origin/body limits, direct links, shortcut manifest/icons and static routing. Disposable PostgreSQL; mocked Neon transport; no production access.',
    );
  } finally {
    await mf.dispose();
    await pg.close();
  }
}
