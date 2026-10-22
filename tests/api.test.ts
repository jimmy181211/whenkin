import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { Temporal } from '@js-temporal/polyfill';
import { createApp } from '../lib/whenkin-api';
const pg=new PGlite();
const app=createApp(()=>({query:async(q,p=[])=>{const result=await pg.query(q,p);return result.rows as Record<string,any>[];}}));
const date=Temporal.Now.plainDateISO('America/Los_Angeles').add({days:3}).toString();
const input={title:'Team, together; at last',organizer_name:'Alex',description:'A simple meeting.\nBring a thought.',timezone:'America/Los_Angeles',duration:60,dates:[date],startTime:'09:00',endTime:'12:00'};
async function request(path:string,method='GET',data?:unknown,token?:string){return app.request('http://localhost/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:data===undefined?undefined:JSON.stringify(data)},{});}
async function create(){const r=await request('/events','POST',input);expect(r.status).toBe(201);return await r.json() as {id:string;adminToken:string};}
async function get(id:string){return await (await request(`/events/${id}`)).json() as any;}
async function respond(id:string,ranges:any[],name='Sam'){const r=await request(`/events/${id}/responses`,'POST',{name,timezone:'America/New_York',ranges});expect(r.status).toBe(201);return await r.json() as {id:string;editToken:string;revision:number};}
beforeAll(async()=>{await pg.exec(await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8'));},30000);
beforeEach(async()=>{await pg.exec('TRUNCATE events CASCADE');});
afterAll(async()=>{await pg.close();});
describe('PostgreSQL-backed event lifecycle',()=>{
  it('PostgreSQL compares timestamps entered in different named time zones',async()=>{
    const r=await pg.query<{same:boolean}>(`SELECT TIMESTAMPTZ '2027-01-15 10:00 America/Los_Angeles'=TIMESTAMPTZ '2027-01-15 13:00 America/New_York' AS same`);
    expect(r.rows[0].same).toBe(true);
  });
  it('creates an event, collects responses, and ranks whole meeting windows in SQL',async()=>{
    const created=await create(),event=await get(created.id);expect(event.timezone).toBe(input.timezone);expect(event.responses).toEqual([]);
    expect(event.admin_hash).toBeUndefined();expect(JSON.stringify(event)).not.toContain(created.adminToken);
    const a=Date.parse(event.windows[0].start);
    const ranges=[{start:new Date(a).toISOString(),end:new Date(a+3600000).toISOString()}];
    const first=await respond(created.id,ranges),second=await respond(created.id,ranges,'Jordan');
    const results=await get(created.id);expect(results.responses).toHaveLength(2);expect(results.candidates[0].available.sort()).toEqual([first.id,second.id].sort());
    expect(Date.parse(results.candidates[0].start)).toBe(a);expect(results.responses[0].edit_hash).toBeUndefined();
    const count=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM availability');expect(count.rows[0].count).toBe(2);
  });
  it('does not count two different half-hour attendees as one full-hour attendee',async()=>{
    const created=await create(),event=await get(created.id),a=Date.parse(event.windows[0].start);
    await respond(created.id,[{start:new Date(a).toISOString(),end:new Date(a+1800000).toISOString()}]);
    await respond(created.id,[{start:new Date(a+1800000).toISOString(),end:new Date(a+3600000).toISOString()}],'Other');
    const results=await get(created.id);expect(results.candidates.every((c:any)=>c.available.length===0)).toBe(true);
  });
  it('saves an empty response as explicitly unavailable',async()=>{
    const created=await create();await respond(created.id,[]);const event=await get(created.id);expect(event.responses).toHaveLength(1);expect(event.responses[0].ranges).toEqual([]);
  });
  it('requires the private token and rejects stale updates without deleting saved availability',async()=>{
    const created=await create(),event=await get(created.id),a=Date.parse(event.windows[0].start),range={start:new Date(a).toISOString(),end:new Date(a+3600000).toISOString()};
    const response=await respond(created.id,[range]);const path=`/events/${created.id}/responses/${response.id}`;
    const payload={name:'Sam',timezone:'Europe/London',revision:1,ranges:[]};
    expect((await request(path,'PUT',payload,'wrong')).status).toBe(403);
    const saved=await request(path,'PUT',payload,response.editToken);expect(saved.status).toBe(200);expect((await saved.json() as any).revision).toBe(2);
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
