import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreEvent } from '../src/lib/load-event';
const response = { id: 'saved-response', token: 'private-token' };
const event = { id: 'event', responses: [], candidates: [] };
afterEach(() => vi.unstubAllGlobals());
describe('optional saved response credentials', () => {
  it('restores valid credentials with a single request', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(event)); vi.stubGlobal('fetch', fetch);
    expect(await restoreEvent('event', response, false)).toEqual({ event, response });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([403, 404])('opens the shared view when saved credentials receive %s', async status => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ error: 'Invalid saved response' }, { status })).mockResolvedValueOnce(Response.json(event));
    vi.stubGlobal('fetch', fetch);
    expect(await restoreEvent('event', response, false)).toEqual({ event, response: null });
    expect(fetch.mock.calls[1][0]).toBe('/api/events/event');
    expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
  });
  it('keeps an explicitly opened private edit link strict', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: 'Invalid edit link' }, { status: 403 })); vi.stubGlobal('fetch', fetch);
    await expect(restoreEvent('event', response, true)).rejects.toThrow('Invalid edit link');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not discard saved credentials for a temporary server failure', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: 'Temporary outage' }, { status: 503 })); vi.stubGlobal('fetch', fetch);
    await expect(restoreEvent('event', response, false)).rejects.toThrow('Temporary outage');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
