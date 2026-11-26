/** Response transport keeps first-save, revision, and verified-deletion contracts. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveEventResponse, removeEventResponse } from '../App/frontend/api/responses';
import { ApiError } from '../App/frontend/api/client';
import type { MeetingEvent } from '../App/shared/types';

const freshEvent: MeetingEvent = {
  id: 'event',
  title: 'Test',
  description: '',
  organizer_name: '',
  timezone: 'UTC',
  windows: [],
  responses: [],
};
const payload = { name: 'Guest', timezone: 'UTC', ranges: [], revision: 2, schedule_revision: 3 };

/** Restore browser globals after each transport fixture. */
afterEach(() => vi.unstubAllGlobals());

describe('response transport', () => {
  /** Preserve POST/PUT choice and JSON metadata while exposing the saved revision. */
  it('creates on first save and updates the same reply afterward', async () => {
    const fetch = vi.fn(
      /** Return a new readable response for each simulated write. */
      async () => new Response(JSON.stringify({ id: 'reply', revision: 3 })),
    );
    vi.stubGlobal('fetch', fetch);
    for (const responseId of [null, 'reply']) {
      await expect(saveEventResponse('event', responseId, payload)).resolves.toEqual({
        id: 'reply',
        revision: 3,
      });
    }
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/events/event/responses',
      expect.objectContaining({ method: 'POST', keepalive: true, body: JSON.stringify(payload) }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/events/event/responses/reply',
      expect.objectContaining({ method: 'PUT', keepalive: true, body: JSON.stringify(payload) }),
    );
  });

  /** A completed delete must not add a verification request. */
  it('sends revision checks and skips reloading after a successful delete', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const load = vi.fn();
    await expect(
      removeEventResponse('event', { id: 'reply', revision: 2 }, 3, load),
    ).resolves.toBeUndefined();
    expect(load).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      '/api/events/event/responses/reply',
      expect.objectContaining({
        method: 'DELETE',
        keepalive: true,
        body: JSON.stringify({ revision: 2, schedule_revision: 3 }),
      }),
    );
  });

  /** Another browser may already have removed the selected reply. */
  it('accepts a 404 only after fresh event data confirms the reply is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Missing reply' }), { status: 404 }),
        ),
    );
    const load = vi.fn().mockResolvedValue(freshEvent);
    await expect(removeEventResponse('event', { id: 'reply', revision: 2 }, 3, load)).resolves.toBe(
      freshEvent,
    );
    expect(load).toHaveBeenCalledOnce();
  });

  /** Keep an inconsistent 404 as an error instead of hiding an existing reply. */
  it('rejects a 404 when the refreshed event still contains the reply', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Missing reply' }), { status: 404 }),
        ),
    );
    const load = vi
      .fn()
      .mockResolvedValue({
        ...freshEvent,
        responses: [{ id: 'reply', name: 'Guest', timezone: 'UTC', revision: 2, ranges: [] }],
      });
    await expect(
      removeEventResponse('event', { id: 'reply', revision: 2 }, 3, load),
    ).rejects.toMatchObject({ status: 404 });
  });

  /** Expiry, conflicts, and temporary server failures must not be treated as removal. */
  it('propagates non-404 failures without refreshing or retrying', async () => {
    for (const status of [409, 410, 500]) {
      const fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: 'Cannot delete' }), { status }));
      vi.stubGlobal('fetch', fetch);
      const load = vi.fn();
      await expect(
        removeEventResponse('event', { id: 'reply', revision: 2 }, 3, load),
      ).rejects.toMatchObject({ status });
      expect(load).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
    }
  });

  /** The event itself may disappear between the deletion failure and verification. */
  it('preserves an expired-event error from verification', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Missing reply' }), { status: 404 }),
        ),
    );
    const error = new ApiError('Expired event', 410);
    const load = vi.fn().mockRejectedValue(error);
    await expect(removeEventResponse('event', { id: 'reply', revision: 2 }, 3, load)).rejects.toBe(
      error,
    );
  });
});
