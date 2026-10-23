import { readEventAccess } from '../src/lib/event-access';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { Temporal } from '@js-temporal/polyfill';
import type { Candidate, MeetingEvent, ResponseData, TimeRange } from '../src/lib/types';
import { createApp } from '../lib/whenkin-api';
const pg=new PGlite();
const app=createApp(()=>({query:async<T,>(q:string,p:unknown[]=[])=>{const result=await pg.query<T>(q,p);return result.rows;}}));
const date=Temporal.Now.plainDateISO('America/Los_Angeles').add({days:3}).toString();
const input={title:'Team, together; at last',organizer_name:'Alex',description:'A simple meeting.\nBring a thought.',timezone:'America/Los_Angeles',duration:60,dates:[date],startTime:'09:00',endTime:'12:00'};
async function request(path:string,method='GET',data?:unknown,token?:string){return app.request('http://localhost/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:data===undefined?undefined:JSON.stringify(data)},{});}
const owners=new Map<string,string>();
async function create(){const r=await request('/events','POST',input);expect(r.status).toBe(201);const result=await r.json() as {id:string;adminToken:string};owners.set(result.id,result.adminToken);return result;}
async function get(id:string){return await (await request(`/events/${id}`,'GET',undefined,owners.get(id))).json() as MeetingEvent;}
async function respond(id:string,ranges:TimeRange[],name='Sam'){const r=await request(`/events/${id}/responses`,'POST',{name,timezone:'America/New_York',ranges});expect(r.status).toBe(201);return await r.json() as {id:string;editToken:string;revision:number};}
beforeAll(async()=>{
  for(const file of (await readdir(new URL('../migrations/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort()) {
    await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
  }
},30000);
beforeEach(async()=>{await pg.exec('TRUNCATE events CASCADE');});
afterAll(async()=>{await pg.close();});
describe('PostgreSQL-backed event lifecycle',()=>{
  it('creates events after 2027 through the end of 2050 and rejects 2051',async()=>{
    for(const date of ['2028-02-29','2050-12-31']){
      const response=await request('/events','POST',{...input,dates:[date]});expect(response.status).toBe(201);
      const created=await response.json() as {id:string;adminToken:string};owners.set(created.id,created.adminToken);
      expect((await get(created.id)).windows[0].start).toContain(date);
    }
    expect((await request('/events','POST',{...input,dates:['2051-01-01']})).status).toBe(400);
  });
  it('creates events without an organizer name and still requires a title',async()=>{
    for(const organizer_name of [undefined,'','   ']){
      const response=await request('/events','POST',{...input,organizer_name});expect(response.status).toBe(201);
      const created=await response.json() as {id:string;adminToken:string};owners.set(created.id,created.adminToken);
      expect((await get(created.id)).organizer_name).toBe('');
    }
    for(const title of [undefined,'','   '])expect((await request('/events','POST',{...input,title,organizer_name:''})).status).toBe(400);
    for(const organizer_name of [123,'x'.repeat(61)])expect((await request('/events','POST',{...input,organizer_name})).status).toBe(400);
  });
  it('PostgreSQL compares timestamps entered in different named time zones',async()=>{
    const r=await pg.query<{same:boolean}>(`SELECT TIMESTAMPTZ '2027-01-15 10:00 America/Los_Angeles'=TIMESTAMPTZ '2027-01-15 13:00 America/New_York' AS same`);
    expect(r.rows[0].same).toBe(true);
  });
  it('creates an event, collects responses, and ranks whole meeting windows in SQL',async()=>{
    const created=await create(),event=await get(created.id);expect(event.timezone).toBe(input.timezone);expect(event.responses).toEqual([]);
    expect((event as MeetingEvent & {admin_hash?:string}).admin_hash).toBeUndefined();expect(JSON.stringify(event)).not.toContain(created.adminToken);
    const a=Date.parse(event.windows[0].start);
    const ranges=[{start:new Date(a).toISOString(),end:new Date(a+3600000).toISOString()}];
    const first=await respond(created.id,ranges),second=await respond(created.id,ranges,'Jordan');
    const results=await get(created.id);expect(results.responses).toHaveLength(2);expect(results.candidates![0].available.sort()).toEqual([first.id,second.id].sort());
    expect(Date.parse(results.candidates![0].start)).toBe(a);expect((results.responses[0] as ResponseData & {edit_hash?:string}).edit_hash).toBeUndefined();
    const count=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM availability');expect(count.rows[0].count).toBe(2);
  });
  it('does not count two different half-hour attendees as one full-hour attendee',async()=>{
    const created=await create(),event=await get(created.id),a=Date.parse(event.windows[0].start);
    await respond(created.id,[{start:new Date(a).toISOString(),end:new Date(a+1800000).toISOString()}]);
    await respond(created.id,[{start:new Date(a+1800000).toISOString(),end:new Date(a+3600000).toISOString()}],'Other');
    const results=await get(created.id);expect(results.candidates!.every((c:Candidate)=>c.available.length===0)).toBe(true);
  });
  it('saves an empty response as explicitly unavailable',async()=>{
    const created=await create();await respond(created.id,[]);const event=await get(created.id);expect(event.responses).toHaveLength(1);expect(event.responses[0].ranges).toEqual([]);
  });
  it('requires the private token and rejects stale updates without deleting saved availability',async()=>{
    const created=await create(),event=await get(created.id),a=Date.parse(event.windows[0].start),range={start:new Date(a).toISOString(),end:new Date(a+3600000).toISOString()};
    const response=await respond(created.id,[range]);const path=`/events/${created.id}/responses/${response.id}`;
    const payload={name:'Sam',timezone:'Europe/London',revision:1,ranges:[]};
    expect((await request(path,'PUT',payload,'wrong')).status).toBe(403);
    const saved=await request(path,'PUT',payload,response.editToken);expect(saved.status).toBe(200);expect((await saved.json() as {revision:number}).revision).toBe(2);
    const stale=await request(path,'PUT',{...payload,ranges:[range]},response.editToken);expect(stale.status).toBe(409);
    const current=await get(created.id);expect(current.responses[0].ranges).toEqual([]);expect(current.responses[0].timezone).toBe('Europe/London');
    expect((await request(path,'PUT',{...payload,revision:2,ranges:[range]},response.editToken)).status).toBe(200);
    expect((await get(created.id)).responses[0].ranges).toHaveLength(1);
  });
  it('protects confirmation and produces a valid UTC calendar invitation',async()=>{
    const created=await create(),event=await get(created.id),start=event.windows[0].start;
    const path=`/events/${created.id}/finalize`;
    expect((await request(path,'POST',{start},'wrong')).status).toBe(403);
    expect((await request(path,'POST',{start:'2020-01-01T00:00Z'},created.adminToken)).status).toBe(400);
    expect((await request(path,'POST',{start},created.adminToken)).status).toBe(200);
    const calendar=await request(`/events/${created.id}/calendar`);expect(calendar.status).toBe(200);
    const contents=await calendar.text();expect(contents).toContain('BEGIN:VCALENDAR\r\n');expect(contents).toMatch(/DTSTART:\d{8}T\d{6}Z/);expect(contents).toContain('SUMMARY:Team\\, together\\; at last');
    expect((await request(path,'POST',{start:null},created.adminToken)).status).toBe(200);
    expect((await get(created.id)).final_start).toBe(null);
  });
  it('rejects cross-origin writes, invalid dates, excessive ranges and invalid JSON',async()=>{
    const cross=await app.request('http://localhost/api/events',{method:'POST',headers:{Origin:'https://elsewhere.example','Content-Type':'application/json'},body:JSON.stringify(input)},{});expect(cross.status).toBe(403);
    expect((await request('/events','POST',{...input,dates:['2026-02-31']})).status).toBe(400);
    expect((await request('/events','POST',{...input,endTime:'08:00'})).status).toBe(400);
    const bad=await app.request('http://localhost/api/events',{method:'POST',body:'{'},{});expect(bad.status).toBe(400);
    expect((await request('/events/not-an-id')).status).toBe(404);
  });
});

describe('participant privacy',()=>{
  it('keeps a shared invitation private when its sender also holds organizer credentials',async()=>{
    const created=await create(),event=await get(created.id);
    const alice=await respond(created.id,[event.windows[0]],'Alice');
    const storedResponse=JSON.stringify({id:alice.id,token:alice.editToken});
    const participant=readEventAccess('',storedResponse);
    const view=await (await request(`/events/${created.id}?response_id=${participant.response!.id}`,'GET',undefined,participant.response!.token)).json() as MeetingEvent;
    expect(participant.organizerToken).toBe('');expect(view.is_organizer).toBe(false);
    expect(view.responses.map(r=>r.id)).toEqual([alice.id]);expect(view.candidates).toEqual([]);
    const organizer=readEventAccess('#organizer='+created.adminToken,storedResponse);
    const full=await (await request(`/events/${created.id}`,'GET',undefined,organizer.organizerToken)).json() as MeetingEvent;
    expect(full.is_organizer).toBe(true);expect(full.candidates!.length).toBeGreaterThan(0);
  });
  it('returns only response counts publicly and authenticates each private response',async()=>{
    const created=await create(),event=await get(created.id),start=Date.parse(event.windows[0].start),ranges=[{start:new Date(start).toISOString(),end:new Date(start+3600000).toISOString()}];
    const alice=await respond(created.id,ranges,'Alice'),bob=await respond(created.id,[],'Bob');
    const publicEvent=await (await request(`/events/${created.id}`)).json() as MeetingEvent;
    expect(publicEvent.response_count).toBe(2);expect(publicEvent.responses).toEqual([]);expect(publicEvent.candidates).toEqual([]);expect(publicEvent).not.toHaveProperty('show_group_availability');expect(publicEvent).not.toHaveProperty('can_view_group');expect(publicEvent.is_organizer).toBe(false);
    expect(JSON.stringify(publicEvent)).not.toContain('Alice');expect(JSON.stringify(publicEvent)).not.toContain(alice.id);
    const mine=await (await request(`/events/${created.id}?response_id=${alice.id}`,'GET',undefined,alice.editToken)).json() as MeetingEvent;
    expect(mine.responses.map((r:ResponseData)=>r.name)).toEqual(['Alice']);expect(mine.response_count).toBe(2);expect(mine.candidates).toEqual([]);
    expect((await request(`/events/${created.id}?response_id=${bob.id}`,'GET',undefined,alice.editToken)).status).toBe(403);
    expect((await get(created.id)).is_organizer).toBe(true);expect((await get(created.id)).responses).toHaveLength(2);
  });
  it('removes sharing settings and ignores legacy sharing flags for existing events',async()=>{
    const created=await create(),event=await get(created.id);
    const alice=await respond(created.id,[event.windows[0]],'Alice'),bob=await respond(created.id,[],'Bob');
    await pg.query('UPDATE events SET show_group_availability=true WHERE id=$1',[created.id]);
    expect((await request('/events/'+created.id+'/settings','PATCH',{show_group_availability:true},created.adminToken)).status).toBe(404);
    const publicEvent=await (await request('/events/'+created.id)).json() as MeetingEvent;
    expect(publicEvent.responses).toEqual([]);expect(publicEvent.candidates).toEqual([]);expect(publicEvent.response_count).toBe(2);
    const mine=await (await request('/events/'+created.id+'?response_id='+alice.id,'GET',undefined,alice.editToken)).json() as MeetingEvent;
    expect(mine.responses.map(r=>r.id)).toEqual([alice.id]);expect(JSON.stringify(mine)).not.toContain(bob.id);expect(mine.candidates).toEqual([]);
    const owner=await get(created.id);expect(owner.responses).toHaveLength(2);expect(owner.candidates!.length).toBeGreaterThan(0);
    expect(owner).not.toHaveProperty('show_group_availability');expect(owner).not.toHaveProperty('can_view_group');
  });});

describe('weekday polls',()=>{
  async function weekly(){
    const result=await request('/events','POST',{...input,schedule_mode:'weekdays',dates:[],weekdays:[1,3,7],startTime:'09:00',endTime:'12:00'});
    expect(result.status).toBe(201);
    const created=await result.json() as {id:string;adminToken:string};owners.set(created.id,created.adminToken);return created;
  }
  it('keeps ordinary events date-based and rejects invalid weekday selections',async()=>{
    const dated=await create();expect((await get(dated.id)).schedule_mode).toBe('dates');
    for(const weekdays of [[],[0],[8],[1,1],[1.5],['1'],null]){
      expect((await request('/events','POST',{...input,schedule_mode:'weekdays',weekdays})).status).toBe(400);
    }
    expect((await request('/events','POST',{...input,schedule_mode:'monthly'})).status).toBe(400);
  });
  it('saves a typical Monday–Sunday week, ranks whole meetings, and keeps responses private',async()=>{
    const created=await weekly(),event=await get(created.id);
    expect(event.schedule_mode).toBe('weekdays');
    expect(event.timezone).toBe('America/Los_Angeles');
    expect(event.windows.map(w=>new Date(w.start).toISOString())).toEqual(['2000-01-03T09:00:00.000Z','2000-01-05T09:00:00.000Z','2000-01-09T09:00:00.000Z']);
    const response=await request(`/events/${created.id}/responses`,'POST',{name:'Sam',timezone:input.timezone,schedule_revision:event.schedule_revision,ranges:[{start:'2000-01-03T09:00:00Z',end:'2000-01-03T10:00:00Z'}]});
    expect(response.status).toBe(201);const person=await response.json() as {id:string;editToken:string};
    expect((await get(created.id)).candidates![0].available).toEqual([person.id]);
    const publicEvent=await (await request(`/events/${created.id}`)).json() as MeetingEvent;
    expect(publicEvent.response_count).toBe(1);expect(publicEvent.responses).toEqual([]);expect(publicEvent.candidates).toEqual([]);
    const own=await (await request(`/events/${created.id}?response_id=${person.id}`,'GET',undefined,person.editToken)).json() as MeetingEvent;
    expect(own.responses.map(r=>r.id)).toEqual([person.id]);
    expect((await request(`/events/${created.id}/responses`,'POST',{name:'New York guest',timezone:'America/New_York',ranges:[]})).status).toBe(201);
    const changed=await request(`/events/${created.id}/responses/${person.id}`,'PUT',{name:'Sam',timezone:'Asia/Kolkata',revision:1,schedule_revision:1,ranges:[]},person.editToken);
    expect(changed.status).toBe(200);
    expect((await get(created.id)).responses.find(r=>r.id===person.id)?.timezone).toBe('Asia/Kolkata');
    expect((await request(`/events/${created.id}/finalize`,'POST',{start:event.windows[0].start},created.adminToken)).status).toBe(400);
    expect((await request(`/events/${created.id}/calendar`)).status).toBe(400);
  });
  it('does not expose event-hour editing for date or weekday events',async()=>{
    for(const created of [await create(),await weekly()]){
      const before=await get(created.id);
      const path='/events/'+created.id+'/schedule';
      const payload={startTime:'10:00',endTime:'13:00',duration:30,schedule_revision:1};
      expect((await request(path,'PATCH',payload,created.adminToken)).status).toBe(404);
      expect((await request(path,'PATCH',payload)).status).toBe(404);
      const after=await get(created.id);
      expect(after.windows).toEqual(before.windows);expect(after.duration).toBe(before.duration);
    }
  });
});

describe('event expiry and participant limits',()=>{
  const payload={name:'Sam',timezone:'UTC',ranges:[]};
  async function expire(id:string){await pg.query("UPDATE events SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);}
  async function seedResponses(id:string,count:number){
    await pg.query(`INSERT INTO responses(id,event_id,name,timezone,edit_hash)
      SELECT gen_random_uuid(),$1,'Guest '||n,'UTC','test-hash' FROM generate_series(1,$2::int) n`,[id,count]);
  }
  it('sets one fixed calendar-month deadline in UTC, including month ends',async()=>{
    const created=await create(),before=await get(created.id);
    const result=await pg.query<{correct:boolean}>(`SELECT expires_at=(((created_at AT TIME ZONE 'UTC')+interval '1 month') AT TIME ZONE 'UTC') AS correct FROM events WHERE id=$1`,[created.id]);
    expect(result.rows[0].correct).toBe(true);expect(before.expires_at).toBeTruthy();
    await respond(created.id,[]);
    expect((await get(created.id)).expires_at).toBe(before.expires_at);
    const end=await pg.query<{day:string}>(`SELECT to_char((TIMESTAMPTZ '2028-01-31 12:00Z' AT TIME ZONE 'UTC')+interval '1 month','YYYY-MM-DD') AS day`);
    expect(end.rows[0].day).toBe('2028-02-29');
  });
  it('expires invitations, organizer links, private edit links, writes and calendar downloads',async()=>{
    const created=await create(),response=await respond(created.id,[]);
    await expire(created.id);
    for(const [path,method,data,token] of [
      [`/events/${created.id}`,'GET',undefined,undefined],
      [`/events/${created.id}`,'GET',undefined,created.adminToken],
      [`/events/${created.id}?response_id=${response.id}`,'GET',undefined,response.editToken],
      [`/events/${created.id}/responses`,'POST',payload,undefined],
      [`/events/${created.id}/responses/${response.id}`,'PUT',{...payload,revision:1},response.editToken],
      [`/events/${created.id}/finalize`,'POST',{start:null},created.adminToken],
      [`/events/${created.id}/calendar`,'GET',undefined,undefined],
    ] as const){
      const result=await request(path,method,data,token);expect(result.status).toBe(410);
      expect(await result.json()).toEqual({error:'This event has expired.'});
    }
    expect((await pg.query('SELECT id FROM responses WHERE event_id=$1',[created.id])).rows).toHaveLength(1);
  });
  it('catches expiration between validation and the write and leaves the response unchanged',async()=>{
    const created=await create(),response=await respond(created.id,[]);
    const racing=createApp(()=>({query:async<T,>(q:string,p:unknown[]=[])=>{
      if(q.includes('WITH gate AS'))await expire(created.id);
      return (await pg.query<T>(q,p)).rows;
    }}));
    const result=await racing.request(`http://localhost/api/events/${created.id}/responses/${response.id}`,{method:'PUT',headers:{Authorization:'Bearer '+response.editToken,'Content-Type':'application/json'},body:JSON.stringify({...payload,revision:1})},{});
    expect(result.status).toBe(410);
    expect((await pg.query<{revision:number}>('SELECT revision FROM responses WHERE id=$1',[response.id])).rows[0].revision).toBe(1);
  });
  it('allows exactly 1,000 saved responses, counts empty responses, and permits existing edits',async()=>{
    const created=await create();await seedResponses(created.id,999);
    const last=await respond(created.id,[]);
    expect((await get(created.id)).response_count).toBe(1000);
    const blocked=await request(`/events/${created.id}/responses`,'POST',payload);
    expect(blocked.status).toBe(409);expect(await blocked.json()).toEqual({error:'This event has reached its limit of 1,000 participants.'});
    const edit=await request(`/events/${created.id}/responses/${last.id}`,'PUT',{...payload,name:'Updated',revision:1},last.editToken);
    expect(edit.status).toBe(200);
    expect((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM responses WHERE event_id=$1',[created.id])).rows[0].count).toBe(1000);
  });
  it('enforces capacity and expiry in PostgreSQL even if the API is bypassed',async()=>{
    const created=await create();await seedResponses(created.id,1000);
    await expect(seedResponses(created.id,1)).rejects.toMatchObject({code:'WK002'});
    const other=await create();await expire(other.id);
    await expect(seedResponses(other.id,1)).rejects.toMatchObject({code:'WK001'});
  });
  it('removes an expired event and all its child records, while preserving active events',async()=>{
    const old=await create(),live=await create();
    const oldResponse=await respond(old.id,(await get(old.id)).windows);
    await respond(live.id,(await get(live.id)).windows);
    await expire(old.id);
    const result=await pg.query<{deleted_events:number}>('SELECT * FROM purge_expired_events(100)');
    expect(result.rows[0].deleted_events).toBe(1);
    expect((await request(`/events/${old.id}`)).status).toBe(404);
    expect((await pg.query('SELECT id FROM event_windows WHERE event_id=$1',[old.id])).rows).toEqual([]);
    expect((await pg.query('SELECT id FROM responses WHERE event_id=$1',[old.id])).rows).toEqual([]);
    expect((await pg.query('SELECT id FROM availability WHERE response_id=$1',[oldResponse.id])).rows).toEqual([]);
    expect((await get(live.id)).response_count).toBe(1);
    expect((await pg.query<{deleted_events:number}>('SELECT * FROM purge_expired_events(100)')).rows[0].deleted_events).toBe(0);
  });
  it('bounds cleanup batches and safely resumes remaining expired records',async()=>{
    for(let n=0;n<3;n++){const created=await create();await expire(created.id);}
    expect((await pg.query<{deleted_events:number}>('SELECT * FROM purge_expired_events(2)')).rows[0].deleted_events).toBe(2);
    expect((await pg.query<{deleted_events:number}>('SELECT * FROM purge_expired_events(2)')).rows[0].deleted_events).toBe(1);
  });
});
