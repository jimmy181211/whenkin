import { describe, expect, it } from 'vitest';
import { readEventAccess } from '../src/lib/event-access';

describe('explicit organizer access',()=>{
  const ownResponse=JSON.stringify({id:'participant',token:'private-response-token'});
  it('opens an ordinary invitation as a participant, even on a returning browser',()=>{
    expect(readEventAccess('',ownResponse)).toEqual({organizerToken:'',response:{id:'participant',token:'private-response-token'}});
    expect(readEventAccess('',null)).toEqual({organizerToken:'',response:null});
  });
  it('grants organizer credentials only from the private organizer link',()=>{
    expect(readEventAccess('#organizer=private-organizer-token',ownResponse).organizerToken).toBe('private-organizer-token');
    expect(readEventAccess('#view=organizer',ownResponse).organizerToken).toBe('');
  });
  it('restores the explicitly linked response without promoting it to organizer',()=>{
    expect(readEventAccess('#edit=another-person.edit-token',ownResponse)).toEqual({organizerToken:'',response:{id:'another-person',token:'edit-token'}});
  });
  it('ignores corrupt or incomplete saved response identities',()=>{
    for(const stored of ['invalid','null','42','{}','{"id":"participant"}','{"id":42,"token":"secret"}']){
      expect(readEventAccess('',stored)).toEqual({organizerToken:'',response:null});
    }
  });
});
