import { describe, expect, it, vi } from 'vitest';
import { readEventAccess } from '../src/lib/event-access';

describe('URL-only response identity', () => {
  it('starts blank even when the browser holds a previous response and draft', () => {
    const getItem = vi.fn(() => JSON.stringify({id:'old-person',token:'old-token'}));
    vi.stubGlobal('localStorage', {getItem});
    for (const fragment of ['', '#organizer=old-token', '#view=organizer']) {
      expect(readEventAccess(fragment)).toEqual({response:null});
    }
    expect(getItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('restores a response only from its private edit URL, without browser storage', () => {
    expect(readEventAccess('#edit=person.private-token')).toEqual({response:{id:'person',token:'private-token'}});
  });
  it('does not turn malformed private URLs into someone else’s reply', () => {
    for (const hash of ['#edit=', '#edit=person', '#edit=.token', '#edit=person.', '#edit=person.token.extra']) {
      expect(readEventAccess(hash)).toEqual({response:null});
    }
  });
});
