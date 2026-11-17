import express from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  createApp,
  type AppOptions,
} from './app.js';
import { errorHandler } from './shared/errors.js';
import type { Database } from './db/types.js';
import { pageRoute } from '../shared/routes.js';
import { documentWithManifest } from './web-manifest.js';

export function createWebApp(
  database: Database,
  options: AppOptions & { staticRoot?: string } = {},
) {
  const app = createApp(database, options);
  const root =
    options.staticRoot ??
    fileURLToPath(new URL('../../client/', import.meta.url));
  let document: Promise<string> | undefined;
  app.use(
    '/assets',
    express.static(join(root, 'assets'), {
      immutable: true,
      maxAge: '1y',
      index: false,
      dotfiles: 'deny',
    }),
  );
  app.use(
    express.static(root, {
      index: false,
      dotfiles: 'deny',
    }),
  );
  app.get(/.*/, async (req, res) => {
    if (req.path.startsWith('/assets/')) {
      return res.status(404).end();
    }
    document ??= readFile(join(root, 'index.html'), 'utf8');
    return res
      .status(pageRoute(req.path).kind === 'not-found' ? 404 : 200)
      .type('html')
      .send(documentWithManifest(await document, req.path));
  });
  app.use(errorHandler);
  return app;
}
