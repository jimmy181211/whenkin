import { describe, expect, it } from 'vitest';
import { readEventAccess } from '../src/lib/event-access';

describe('shared links and private response editing',()=>{
  const ownResponse=JSON.stringify({id:'participant',token:'private-response-token'});
  it('restores only the current response on a returning browser',()=>{
    expect(readEventAccess('',ownResponse)).toEqual({response:{id:'participant',token:'private-response-token'}});
    expect(readEventAccess('',null)).toEqual({response:null});
  });
  it('ignores obsolete organizer fragments while preserving response editing',()=>{
    expect(readEventAccess('#organizer=private-organizer-token',ownResponse)).toEqual({response:{id:'participant',token:'private-response-token'}});
    expect(readEventAccess('#view=organizer',null)).toEqual({response:null});
  });
  it('restores the explicitly linked response',()=>{
    expect(readEventAccess('#edit=another-person.edit-token',ownResponse)).toEqual({response:{id:'another-person',token:'edit-token'}});
  });
  it('ignores corrupt or incomplete saved response identities',()=>{
    for(const stored of ['invalid','null','42','{}','{"id":"participant"}','{"id":42,"token":"secret"}']){
      expect(readEventAccess('',stored)).toEqual({response:null});
    }
  });
});
