import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../App/frontend/api/client';

afterEach(
  /* Restore browser globals replaced by API transport tests. */
  () => vi.unstubAllGlobals(),
);
/** Group the connection failures explain the next step checks. */
describe('connection failures explain the next step', () => {
  /**
   * Replaces the browser’s raw failed-to-fetch error with a useful
   * message.
   */
  it('replaces the browser’s raw failed-to-fetch error with a useful message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/events', { method: 'POST' })).rejects.toThrow('We couldn’t reach Whenkin.');
  });
  /**
   * Rejects a static HTML fallback instead of treating it as a saved
   * event.
   */
  it('rejects a static HTML fallback instead of treating it as a saved event', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<html>Website only</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          }),
        ),
    );
    await expect(api('/events', { method: 'POST' })).rejects.toThrow(
      'Event saving is not available at this address yet.',
    );
  });
  /** Preserves the server’s setup message. */
  it('preserves the server’s setup message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: 'Database setup is not complete.' }, { status: 503 }),
        ),
    );
    await expect(api('/events', { method: 'POST' })).rejects.toThrow(
      'Database setup is not complete.',
    );
  });
  /** Returns readiness without inventing a successful event. */
  it('returns readiness without inventing a successful event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ready: false })));
    expect(await api('/health')).toEqual({ ready: false });
  });
});
