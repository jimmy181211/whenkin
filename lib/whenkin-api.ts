import { Hono } from 'hono';
import { neon } from '@neondatabase/serverless';
import { Temporal } from '@js-temporal/polyfill';
import { allSlots, contains, isTimezone, localToUTC, SLOT, slotsToRanges } from '../src/lib/time';
import type { CreateInput, TimeRange } from '../src/lib/types';

type Row = Record<string, any>;
export type Database = { query: (query: string, params?: any[]) => Promise<Row[]> };
type Env = { DATABASE_URL?: string; ASSETS?: Fetcher; WRITE_LIMITER?: { limit: (arg: {key:string}) => Promise<{success:boolean}> } };
class Problem extends Error { constructor(public status: 400 | 403 | 404 | 409 | 413 | 429 | 503, message: string) { super(message); } }
const uid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const checkId = (value:string) => { if (!uid.test(value)) throw new Problem(404,'This event or response could not be found.'); };
const text = (value:unknown, label:string, max:number, optional=false) => {
  if(typeof value!=='string' || value.trim().length>max || (!optional&&!value.trim())) throw new Problem(400,`Please enter ${label} (${max} characters or fewer).`);
  return value.trim();
};
export async function hash(value:string) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function token() { return crypto.randomUUID()+crypto.randomUUID(); }
async function body(request:Request) {
  const reader=request.body?.getReader(); if(!reader) throw new Problem(400,'Please include your event information.');
  let size=0; const chunks:Uint8Array[]=[];
  while(true) { const part=await reader.read(); if(part.done) break; size+=part.value.length; if(size>131072) { await reader.cancel(); throw new Problem(413,'This request is too large. Please choose fewer dates.'); } chunks.push(part.value); }
  const buffer=new Uint8Array(size); let cursor=0; chunks.forEach(chunk=>{buffer.set(chunk,cursor);cursor+=chunk.length;});
  try { const parsed=JSON.parse(new TextDecoder().decode(buffer)); if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw Error(); return parsed; }
  catch { throw new Problem(400,'The information could not be read. Please try again.'); }
}
export function validateEvent(input:CreateInput) {
  const title=text(input.title,'an event name',100), organizer=text(input.organizer_name,'your name',60), description=text(input.description??'','a description',1000,true);
  if(!isTimezone(input.timezone)) throw new Problem(400,'Please choose a valid time zone.');
  if(!Number.isInteger(input.duration)||input.duration<15||input.duration>240||input.duration%15) throw new Problem(400,'Choose a meeting length between 15 minutes and 4 hours.');
  if(!Array.isArray(input.dates)||!input.dates.length||input.dates.length>31||new Set(input.dates).size!==input.dates.length) throw new Problem(400,'Choose between 1 and 31 different dates.');
  const validTime=/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/;
  if(!validTime.test(input.startTime)||!(validTime.test(input.endTime)||input.endTime==='24:00')||input.endTime<=input.startTime) throw new Problem(400,'The end time must be after the start time on the same day.');
  const windows:TimeRange[]=input.dates.map(date=>{
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Problem(400,'Please choose valid dates.');
    try {
      const d=Temporal.PlainDate.from(date), today=Temporal.Now.plainDateISO(input.timezone);
      if(Temporal.PlainDate.compare(d,today)<0||Temporal.PlainDate.compare(d,today.add({years:1}))>0) throw new Problem(400,'Choose dates between today and one year from now.');
      const start=localToUTC(date,input.startTime,input.timezone),end=localToUTC(date,input.endTime,input.timezone);
      if(Date.parse(end)-Date.parse(start)<input.duration*60000) throw new Problem(400,'The time window must be at least as long as the meeting.');
      return {start,end};
    } catch(error) {
      if(error instanceof Problem) throw error;
      throw new Problem(400,'A chosen time is invalid or repeats during a daylight saving change. Choose a different start or end time.');
    }
  });
  return {title,organizer,description,windows:windows.sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))};
}
export function validateRanges(input:unknown,windows:TimeRange[]) {
  if(!Array.isArray(input)||input.length>3000) throw new Problem(400,'Please choose valid availability.');
  const allowed=new Set(allSlots(windows)), selected=new Set<number>();let requestedSlots=0;
  for(const range of input) {
    if(!range||typeof range.start!=='string'||typeof range.end!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(range.start)||!/(Z|[+-]\d\d:\d\d)$/.test(range.end)) throw new Problem(400,'Availability needs a date, time, and time-zone offset.');
    const a=Date.parse(range.start),b=Date.parse(range.end);
    if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||(b-a)%SLOT||b-a>32*86400000) throw new Problem(400,'Please select complete 15-minute intervals.');
    requestedSlots+=(b-a)/SLOT;if(requestedSlots>allowed.size*2)throw new Problem(400,'Too many overlapping selections. Please reload and try again.');
    for(let t=a;t<b;t+=SLOT) { if(!allowed.has(t)) throw new Problem(400,'Some selected times are outside this event. Reload the event and try again.'); selected.add(t); }
  }
  return slotsToRanges(selected);
}
export function createApp(factory?:(env:Env)=>Database) {
  const app=new Hono<{Bindings:Env}>();
  const db=(env:Env):Database=>{
    if(factory) return factory(env);
    if(!env.DATABASE_URL) throw new Problem(503,'Whenkin is not connected to its database yet. Please try again once setup is complete.');
    const sql=neon(env.DATABASE_URL);return {query:async(q,p=[])=>await sql.query(q,p) as Row[]};
  };
  app.use('*',async(c,next)=>{
    if(c.req.method!=='GET'&&c.req.method!=='HEAD') {
      const origin=c.req.header('Origin');
      if(origin&&origin!==new URL(c.req.url).origin) throw new Problem(403,'Please make changes from the Whenkin website.');
      if(c.env.WRITE_LIMITER) { const result=await c.env.WRITE_LIMITER.limit({key:c.req.header('CF-Connecting-IP')||'unknown'}); if(!result.success) throw new Problem(429,'Too many changes at once. Please wait a minute and try again.'); }
    }
    await next();
    c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy','no-referrer');c.header('X-Frame-Options','DENY');
    c.header('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    c.header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if(c.req.path.startsWith('/api')) c.header('Cache-Control','no-store');
  });
  app.get('/api/health',async c=>{
    if(!c.env.DATABASE_URL&&!factory) return c.json({ready:false});
    try { await db(c.env).query('SELECT 1 FROM events LIMIT 1');return c.json({ready:true}); } catch { return c.json({ready:false}); }
  });
  app.post('/api/events',async c=>{
    const input=await body(c.req.raw) as CreateInput, valid=validateEvent(input),id=crypto.randomUUID(),secret=token(),digest=await hash(secret);
    await db(c.env).query(`WITH event AS (
      INSERT INTO events(id,title,description,organizer_name,timezone,duration,admin_hash) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id
    ) INSERT INTO event_windows(event_id,starts_at,ends_at)
      SELECT event.id,w.start::timestamptz,w.end::timestamptz FROM event CROSS JOIN jsonb_to_recordset($8::jsonb) AS w(start text,"end" text)`,
    [id,valid.title,valid.description,valid.organizer,input.timezone,input.duration,digest,JSON.stringify(valid.windows)]);
    return c.json({id,adminToken:secret},201);
  });
  async function readEvent(database:Database,id:string) {
    checkId(id);
    const rows=await database.query(`SELECT e.id,e.title,e.description,e.organizer_name,e.timezone,e.duration,e.final_start,e.final_end,e.created_at,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('start',w.starts_at,'end',w.ends_at) ORDER BY w.starts_at) FROM event_windows w WHERE w.event_id=e.id),'[]'::jsonb) AS windows,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'timezone',r.timezone,'revision',r.revision,
        'ranges',COALESCE((SELECT jsonb_agg(jsonb_build_object('start',a.starts_at,'end',a.ends_at) ORDER BY a.starts_at) FROM availability a WHERE a.response_id=r.id),'[]'::jsonb)) ORDER BY r.updated_at) FROM responses r WHERE r.event_id=e.id),'[]'::jsonb) AS responses
      FROM events e WHERE e.id=$1`,[id]);
    if(!rows.length) throw new Problem(404,'This event could not be found. Check the link with its organizer.');
    const event=rows[0];
    event.candidates=await database.query(`WITH merged AS (
      SELECT unnest(range_agg(tstzrange(starts_at,ends_at,'[)'))) AS span FROM event_windows WHERE event_id=$1
    ), slots AS (
      SELECT DISTINCT generate_series(lower(span),upper(span)-($2 * interval '1 minute'),interval '15 minutes') AS start FROM merged
    ) SELECT s.start,s.start+($2 * interval '1 minute') AS "end",
      COALESCE((SELECT jsonb_agg(r.id ORDER BY r.id) FROM responses r WHERE r.event_id=$1 AND EXISTS (
        SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.start+($2 * interval '1 minute')
      )),'[]'::jsonb) AS available,
      COALESCE((SELECT jsonb_agg(r.id ORDER BY r.id) FROM responses r WHERE r.event_id=$1 AND NOT EXISTS (
        SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.start+($2 * interval '1 minute')
      )),'[]'::jsonb) AS missing
      FROM slots s ORDER BY jsonb_array_length(COALESCE((SELECT jsonb_agg(r.id) FROM responses r WHERE r.event_id=$1 AND EXISTS (
        SELECT 1 FROM availability a WHERE a.response_id=r.id AND a.starts_at<=s.start AND a.ends_at>=s.start+($2 * interval '1 minute')
      )),'[]'::jsonb)) DESC,s.start`,[id,event.duration]);
    return event;
  }
  app.get('/api/events/:id',async c=>c.json(await readEvent(db(c.env),c.req.param('id'))));
  app.post('/api/events/:id/responses',async c=>{
    const database=db(c.env),event=await readEvent(database,c.req.param('id')),input=await body(c.req.raw);
    const name=text(input.name,'your name',60);if(!isTimezone(input.timezone)) throw new Problem(400,'Please choose a valid time zone.');
    const ranges=validateRanges(input.ranges,event.windows),id=crypto.randomUUID(),secret=token();
    await database.query(`WITH response AS (
      INSERT INTO responses(id,event_id,name,timezone,edit_hash) VALUES($1,$2,$3,$4,$5) RETURNING id
    ) INSERT INTO availability(response_id,starts_at,ends_at)
      SELECT response.id,a.start::timestamptz,a.end::timestamptz FROM response CROSS JOIN jsonb_to_recordset($6::jsonb) AS a(start text,"end" text)`,
    [id,event.id,name,input.timezone,await hash(secret),JSON.stringify(ranges)]);
    return c.json({id,editToken:secret,revision:1},201);
  });
  app.put('/api/events/:id/responses/:responseId',async c=>{
    const database=db(c.env),event=await readEvent(database,c.req.param('id')),id=c.req.param('responseId');checkId(id);
    const secret=c.req.header('Authorization')?.replace(/^Bearer /,'')||'',digest=await hash(secret);
    const owned=await database.query('SELECT id FROM responses WHERE id=$1 AND event_id=$2 AND edit_hash=$3',[id,event.id,digest]);
    if(!owned.length) throw new Problem(403,'Use your private edit link to change this response.');
    const input=await body(c.req.raw),name=text(input.name,'your name',60);
    if(!isTimezone(input.timezone)||!Number.isInteger(input.revision)||input.revision<1) throw new Problem(400,'Please reload this response and choose a valid time zone.');
    const ranges=validateRanges(input.ranges,event.windows);
    const updated=await database.query(`WITH target AS (
      UPDATE responses SET name=$1,timezone=$2,revision=revision+1,updated_at=now() WHERE id=$3 AND edit_hash=$4 AND revision=$5 RETURNING id,revision
    ), removed AS (
      DELETE FROM availability WHERE response_id IN (SELECT id FROM target) RETURNING id
    ), inserted AS (
      INSERT INTO availability(response_id,starts_at,ends_at)
      SELECT target.id,a.start::timestamptz,a.end::timestamptz FROM target CROSS JOIN jsonb_to_recordset($6::jsonb) AS a(start text,"end" text)
      WHERE (SELECT count(*) FROM removed)>=0 RETURNING id
    ) SELECT id,revision FROM target`,[name,input.timezone,id,digest,input.revision,JSON.stringify(ranges)]);
    if(!updated.length) throw new Problem(409,'This response changed in another tab. Your draft is kept here. Reload before saving again.');
    return c.json(updated[0]);
  });
  app.post('/api/events/:id/finalize',async c=>{
    const database=db(c.env),id=c.req.param('id'),event=await readEvent(database,id);
    const secret=c.req.header('Authorization')?.replace(/^Bearer /,'')||'';
    const owned=await database.query('SELECT id FROM events WHERE id=$1 AND admin_hash=$2',[id,await hash(secret)]);
    if(!owned.length) throw new Problem(403,'Only the organizer can confirm the final time. Use the organizer link.');
    const input=await body(c.req.raw);
    if(input.start===null) { await database.query('UPDATE events SET final_start=NULL,final_end=NULL WHERE id=$1',[id]);return c.json({ok:true}); }
    const start=Date.parse(input.start),end=start+event.duration*60000;
    if(!allSlots(event.windows).includes(start)||!contains(event.windows,start,end)) throw new Problem(400,'Choose a meeting time within the event dates.');
    await database.query('UPDATE events SET final_start=$1::timestamptz,final_end=$2::timestamptz WHERE id=$3',[new Date(start).toISOString(),new Date(end).toISOString(),id]);
    return c.json({ok:true});
  });
  app.get('/api/events/:id/calendar',async c=>{
    const event=await readEvent(db(c.env),c.req.param('id'));
    if(!event.final_start) throw new Problem(400,'The organizer has not confirmed a time yet.');
    const stamp=(v:string)=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const escape=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Whenkin//Scheduling//EN','BEGIN:VEVENT',`UID:${event.id}@whenkin`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(event.final_start)}`,`DTEND:${stamp(event.final_end)}`,`SUMMARY:${escape(event.title)}`,`DESCRIPTION:${escape(event.description)}`,'END:VEVENT','END:VCALENDAR'];
    // RFC 5545 folding counts UTF-8 octets and never splits a code point.
    const fold=(line:string)=>{let result='',current='',size=0;for(const ch of line){const n=new TextEncoder().encode(ch).length;if(size+n>74){result+=current+'\r\n ';current='';size=1;}current+=ch;size+=n;}return result+current;};
    return new Response(lines.map(fold).join('\r\n')+'\r\n',{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="whenkin.ics"','Cache-Control':'no-store'}});
  });
  app.all('/api/*',c=>c.json({error:'This action could not be found.'},404));
  app.get('*',async c=>c.env.ASSETS?await c.env.ASSETS.fetch(c.req.raw):c.text('Start the website with npm run dev.',404));
  app.onError((error,c)=>{
    if(error instanceof Problem) return c.json({error:error.message},error.status);
    // Do not return database details, connection strings, or tokens to visitors or logs.
    return c.json({error:'Your change could not be saved. Please try again in a moment.'},503);
  });
  return app;
}
export default createApp();
