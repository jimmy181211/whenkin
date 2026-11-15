import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { neon } from '@neondatabase/serverless';
import { createApp } from '../../App/backend/app.js';
import { Problem } from '../../App/backend/shared/validation.js';
import type { Database } from '../../App/backend/db/types.js';
import { pageRoute } from '../../App/shared/routes.js';

// Keep the current Sites/Neon deployment working until the EC2 cutover.
// All six endpoints use the same Express app and SQL as the Node deployment.
const database: Database = {
  async query<T>(sql: string, params: unknown[] = []) {
    if (!env.DATABASE_URL) throw new Problem(503, 'Whenkin is not connected to its database yet. Please try again once setup is complete.');
    return await neon(env.DATABASE_URL).query(sql, params) as T[];
  },
};
const app = createApp(database, { trustProxy: true });
app.listen(3000);
const nodeHandler = httpServerHandler({ port: 3000 });

export default {
  async fetch(request: Request, bindings: unknown, context: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const headers = new Headers(request.headers);
      headers.set('Host', url.host);
      headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));
      headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || 'unknown');
      return nodeHandler.fetch(new Request(request, { headers }), bindings, context);
    }
    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && !url.pathname.startsWith('/assets/')) {
      url.pathname = '/index.html';
      const document = await env.ASSETS.fetch(new Request(url, request));
      response = new Response(document.body, {
        status: pageRoute(new URL(request.url).pathname).kind === 'not-found' ? 404 : 200,
        headers: document.headers,
      });
    }
    response = new Response(response.body, response);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    response.headers.set('Cache-Control', response.ok && url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store');
    return response;
  },
};
