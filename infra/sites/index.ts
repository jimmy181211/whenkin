import { CONTENT_SECURITY_POLICY } from '../../App/backend/shared/security';
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { neon } from '@neondatabase/serverless';
import { createApp } from '../../App/backend/app.js';
import { Problem } from '../../App/backend/shared/validation.js';
import type { Database } from '../../App/backend/db/types.js';
import { pageRoute } from '../../App/shared/routes.js';
import { documentWithManifest } from '../../App/backend/web-manifest.js';

// Keep the current Sites/Neon deployment working until the EC2 cutover.
// The API uses the same Express app and SQL as the Node deployment.
const database: Database = {
  /**
   * Run parameterized SQL through the current host's HTTP database adapter.
   * @returns The result rows after the hosted query completes; database failures reject.
   */
  async query<T>(sql: string, params: unknown[] = []) {
    if (!env.DATABASE_URL) {
      throw new Problem(
        503,
        'Whenkin is not connected to its database yet. Please try again once setup is complete.',
      );
    }
    return (await neon(env.DATABASE_URL).query(sql, params)) as T[];
  },
};
const app = createApp(database, { trustProxy: true });
app.listen(3000);
const nodeHandler = httpServerHandler({ port: 3000 });

/**
 * Resolve a successful HTML document across the hosted and local asset
 * conventions.
 * @returns Page HTML with the correct manifest link, or a 503 response if no document loads.
 */
async function appDocument(request: Request): Promise<Response> {
  // The hosted asset service canonicalizes index.html to /; local assets can
  // instead require index.html. Accept only a real HTML response, never a redirect.
  for (const path of [
    '/',
    '/index.html',
  ]) {
    const document = await env.ASSETS.fetch(new Request(new URL(path, request.url), request));
    if (document.ok && document.headers.get('Content-Type')?.includes('text/html')) {
      const headers = new Headers(document.headers);
      headers.delete('Content-Length');
      headers.delete('Content-Encoding');
      headers.delete('ETag');
      return new Response(
        documentWithManifest(await document.text(), new URL(request.url).pathname),
        {
          status: document.status,
          headers,
        },
      );
    }
  }
  return new Response('The page is temporarily unavailable. Please reload.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export default {
  /**
   * Route API requests to Express and resolve page HTML through hosted
   * assets.
   * @returns The API, page, or asset response, retaining not-found and unavailable statuses.
   */
  async fetch(request: Request, bindings: unknown, context: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.pathname === '/api' ||
      url.pathname.startsWith('/api/') ||
      url.pathname === '/site.webmanifest'
    ) {
      const headers = new Headers(request.headers);
      headers.set('Host', url.host);
      headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));
      headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || 'unknown');
      return nodeHandler.fetch(new Request(request, { headers }), bindings, context);
    }
    // Keep /e/:id in the browser while serving the complete React document.
    const appPage = pageRoute(url.pathname).kind !== 'not-found';
    let response = appPage ? await appDocument(request) : await env.ASSETS.fetch(request);
    if (!appPage && response.status === 404 && !url.pathname.startsWith('/assets/')) {
      const document = await appDocument(request);
      response = new Response(document.body, {
        status: document.ok ? 404 : document.status,
        headers: document.headers,
      });
    }
    response = new Response(response.body, response);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    response.headers.set(
      'Cache-Control',
      response.ok && url.pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-store',
    );
    return response;
  },
};
