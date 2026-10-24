import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEvent } from '../src/lib/load-event';
const response = {id:'saved-response',token:'private-token'};
const event = {id:'event',responses:[],candidates:[]};
afterEach(() => vi.unstubAllGlobals());
describe('shared and private event requests', () => {
  it('loads a fresh shared view without response credentials', async () => {
    const fetch=vi.fn().mockResolvedValue(Response.json(event));vi.stubGlobal('fetch',fetch);
    expect(await loadEvent('event',null)).toEqual(event);
    expect(fetch.mock.calls[0][0]).toBe('/api/events/event');
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });
  it('loads the explicitly linked private response', async () => {
    const fetch=vi.fn().mockResolvedValue(Response.json(event));vi.stubGlobal('fetch',fetch);
    await loadEvent('event',response);
    expect(fetch.mock.calls[0][0]).toBe('/api/events/event?response_id=saved-response');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer private-token');
  });
  it('reports an invalid private link without silently creating a new reply', async () => {
    const fetch=vi.fn().mockResolvedValue(Response.json({error:'Invalid edit link'},{status:403}));vi.stubGlobal('fetch',fetch);
    await expect(loadEvent('event',response)).rejects.toThrow('Invalid edit link');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
