import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
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
beforeAll(async()=>{await pg.exec(await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../migrations/002_participant_privacy.sql',import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../migrations/003_schedule_revision.sql',import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../migrations/004_optional_organizer_name.sql',import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../migrations/005_weekday_polls.sql',import.meta.url),'utf8'));},30000);
beforeEach(async()=>{await pg.exec('TRUNCATE events CASCADE');});
afterAll(async()=>{await pg.close();});
describe('PostgreSQL-backed event lifecycle',()=>{
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
    expect((await request(`/events/${created.id}/responses`,'POST',{name:'Wrong zone',timezone:'America/New_York',ranges:[]})).status).toBe(400);
    const changed=await request(`/events/${created.id}/responses/${person.id}`,'PUT',{name:'Sam',timezone:input.timezone,revision:1,schedule_revision:1,ranges:[]},person.editToken);
    expect(changed.status).toBe(200);
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
