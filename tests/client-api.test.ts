import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../src/lib/api';

afterEach(()=>vi.unstubAllGlobals());
describe('connection failures explain the next step',()=>{
  it('replaces the browser’s raw failed-to-fetch error with a useful message',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/events',{method:'POST'})).rejects.toThrow('We couldn’t reach Whenkin.');
  });
  it('rejects a static HTML fallback instead of treating it as a saved event',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>Website only</html>',{status:200,headers:{'Content-Type':'text/html'}})));
    await expect(api('/events',{method:'POST'})).rejects.toThrow('Event saving is not available at this address yet.');
  });
  it('preserves the server’s setup message',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'Database setup is not complete.'},{status:503})));
    await expect(api('/events',{method:'POST'})).rejects.toThrow('Database setup is not complete.');
  });
  it('returns readiness without inventing a successful event',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({ready:false})));
    expect(await api('/health')).toEqual({ready:false});
  });
});
