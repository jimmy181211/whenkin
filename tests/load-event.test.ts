import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { loadEvent } from '../App/frontend/api/load-event';
const event = {
  id: 'event',
  responses: [],
  candidates: [],
};
afterEach(
  /* Restore the fetch/browser globals replaced by event-loading tests. */
  () => vi.unstubAllGlobals(),
);
/** Group the one shared event request checks. */
describe('one shared event request', () => {
  /**
   * Loads group data without credentials, query-based identity, or browser
   * storage.
   */
  it('loads group data without credentials, query-based identity, or browser storage', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(event));
    const getItem = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('localStorage', { getItem });
    expect(await loadEvent('event')).toEqual(event);
    expect(fetch.mock.calls[0][0]).toBe('/api/events/event');
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(getItem).not.toHaveBeenCalled();
  });
});
