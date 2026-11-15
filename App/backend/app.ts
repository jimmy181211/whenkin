import express from 'express';
import type { Database } from './db/types.js';
import { Problem } from './shared/validation.js';
import { createWriteLimiter } from './shared/write-limit.js';
import { errorHandler } from './shared/errors.js';
import health from './api/health.js';
import createEvent from './api/create-event.js';
import getEvent from './api/get-event.js';
import createResponse from './api/create-response.js';
import updateResponse from './api/update-response.js';
import deleteResponse from './api/delete-response.js';

export type AppOptions = {
  publicOrigin?: string;
  trustProxy?: boolean;
  rateLimit?: boolean;
};

export function createApp(database: Database, options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? false);
  const limiter = createWriteLimiter();
  const publicOrigin = options.publicOrigin ? new URL(options.publicOrigin).origin : undefined;
  app.use(async (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (!req.path.startsWith('/assets/')) res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.get('Origin');
      if (origin && origin !== (publicOrigin || req.protocol + '://' + req.get('host'))) {
        throw new Problem(403, 'Please make changes from the Whenkin website.');
      }
      if (options.rateLimit !== false && !(await limiter.limit({ key: req.ip || 'unknown' })).success) {
        throw new Problem(429, 'Too many changes at once. Please wait a minute and try again.');
      }
    }
    next();
  });
  // Keep the previous 128 KiB JSON-body limit, including clients without a content type.
  app.use(express.json({ limit: 131072, strict: true, type: () => true }));
  app.get('/api/health', health(database));
  app.post('/api/events', createEvent(database));
  app.get('/api/events/:id', getEvent(database));
  app.post('/api/events/:id/responses', createResponse(database));
  app.put('/api/events/:id/responses/:responseId', updateResponse(database));
  app.delete('/api/events/:id/responses/:responseId', deleteResponse(database));
  app.all(/^\/api(?:\/|$)/, (_req, res) => res.status(404).json({ error: 'This action could not be found.' }));
  app.use(errorHandler);
  return app;
}
