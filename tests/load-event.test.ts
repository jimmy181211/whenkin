import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEvent } from '../src/lib/load-event';
const event={id:'event',responses:[],candidates:[]};
afterEach(()=>vi.unstubAllGlobals());
describe('one shared event request',()=>{
  it('loads group data without credentials, query-based identity, or browser storage',async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json(event)),getItem=vi.fn();
    vi.stubGlobal('fetch',fetch);vi.stubGlobal('localStorage',{getItem});
    expect(await loadEvent('event')).toEqual(event);
    expect(fetch.mock.calls[0][0]).toBe('/api/events/event');
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(getItem).not.toHaveBeenCalled();
  });
});
