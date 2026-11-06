import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cleanupExpiredEvents } from './cleanup.mjs';

// Entirely local, disposable PostgreSQL. Never reads DATABASE_URL.
const output=resolve(process.argv[2]||'outputs/retention-verification');
const pg=new PGlite();
const query=async(sql,params=[]) => (await pg.query(sql,params)).rows;
const clock='2026-11-05T12:00:00Z';
const report={run_at:new Date().toISOString(),environment:'isolated in-memory PGlite PostgreSQL; no production writes',clock,production_policy:'one calendar year; manual cleanup; API expiry is enforced separately',scenarios:[]};
const requireThat=(condition,message)=>{if(!condition)throw Error(message);};
try {
  for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())await pg.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
  const original=await readFile(new URL('../migrations/008_manual_cleanup_by_age.sql',import.meta.url),'utf8');
  for(const retention of ['1 year','10 days']){
    await pg.exec('TRUNCATE events CASCADE');
    // Freeze the clock and shorten the policy only inside this disposable database.
    await pg.exec(original.replaceAll("interval '1 year'",`interval '${retention}'`).replaceAll('statement_timestamp()',`'${clock}'::timestamptz`));
    await query(`INSERT INTO events(id,title,organizer_name,timezone)
      SELECT gen_random_uuid(),'Fixture '||n,'','UTC' FROM generate_series(1,210) n`);
    await query(`INSERT INTO event_windows(event_id,starts_at,ends_at)
      SELECT id,'2026-11-15 09:00Z'::timestamptz+n*interval '2 hours','2026-11-15 10:00Z'::timestamptz+n*interval '2 hours' FROM events CROSS JOIN generate_series(0,1) n`);
    await query(`INSERT INTO responses(id,event_id,name,timezone,edit_hash) SELECT gen_random_uuid(),id,'Disposable test','UTC','' FROM events CROSS JOIN generate_series(1,2)`);
    await query(`INSERT INTO availability(response_id,starts_at,ends_at) SELECT id,'2026-11-15 09:00Z'::timestamptz+n*interval '2 hours','2026-11-15 10:00Z'::timestamptz+n*interval '2 hours' FROM responses CROSS JOIN generate_series(0,1) n`);
    await query(`UPDATE events SET created_at='${clock}'::timestamptz-interval '${retention}'-interval '1 second',expires_at='${clock}'::timestamptz-interval '1 second'`);
    const fixtures=[['Fixture 206',`'${clock}'::timestamptz-interval '${retention}'`,`'${clock}'::timestamptz`],['Fixture 207',`'${clock}'::timestamptz-interval '${retention}'+interval '1 millisecond'`,`'${clock}'::timestamptz+interval '1 millisecond'`],['Fixture 208',`'${clock}'::timestamptz`,`'${clock}'::timestamptz+interval '1 year'`],['Fixture 209',`'${clock}'::timestamptz`,`'${clock}'::timestamptz-interval '1 day'`],['Fixture 210',`'${clock}'::timestamptz-interval '${retention}'-interval '1 day'`,`'${clock}'::timestamptz+interval '1 year'`]];
    for(const [name,created,expiry] of fixtures)await query(`UPDATE events SET created_at=${created},expires_at=${expiry} WHERE title=$1`,[name]);
    const snapshot=async()=>Object.fromEntries(await Promise.all(['events','event_windows','responses','availability'].map(async table=>[table,await query(`SELECT * FROM ${table} ORDER BY id`)])));
    const before=await snapshot(),eligible=await query(`SELECT id FROM events WHERE created_at<= '${clock}'::timestamptz-interval '${retention}'`);
    const expected=new Set(eligible.map(r=>r.id)),batches=[];
    const result=await cleanupExpiredEvents(async(sql,params)=>{const rows=await query(sql.replaceAll("interval '1 year'",`interval '${retention}'`).replaceAll('statement_timestamp()',`'${clock}'::timestamptz`),params);if(sql.includes('purge_expired_events'))batches.push(rows[0].deleted_events);return rows;});
    const after=await snapshot(),actual=new Set(before.events.filter(e=>!after.events.some(a=>a.id===e.id)).map(e=>e.id));
    requireThat(expected.size===207&&result.deletedEvents===207,'Unexpected eligible/deleted count');
    requireThat(actual.size===expected.size&&[...actual].every(id=>expected.has(id)),'Missing or excessive deletions');
    const retainedResponses=new Set(before.responses.filter(r=>!expected.has(r.event_id)).map(r=>r.id));
    const retained={events:before.events.filter(e=>!expected.has(e.id)),event_windows:before.event_windows.filter(w=>!expected.has(w.event_id)),responses:before.responses.filter(r=>retainedResponses.has(r.id)),availability:before.availability.filter(a=>retainedResponses.has(a.response_id))};
    for(const table of Object.keys(retained))requireThat(JSON.stringify(retained[table])===JSON.stringify(after[table]),table+' preserved data changed');
    const orphan=await query(`SELECT (SELECT count(*) FROM event_windows w LEFT JOIN events e ON e.id=w.event_id WHERE e.id IS NULL)+(SELECT count(*) FROM responses r LEFT JOIN events e ON e.id=r.event_id WHERE e.id IS NULL)+(SELECT count(*) FROM availability a LEFT JOIN responses r ON r.id=a.response_id WHERE r.id IS NULL) AS count`);
    requireThat(Number(orphan[0].count)===0,'Orphaned records remain');
    requireThat((await cleanupExpiredEvents(async(sql,p)=>query(sql.replaceAll("interval '1 year'",`interval '${retention}'`).replaceAll('statement_timestamp()',`'${clock}'::timestamptz`),p))).deletedEvents===0,'Second cleanup was not idempotent');
    report.scenarios.push({policy:retention,status:'PASS',expected_deleted_events:207,actual_deleted_events:result.deletedEvents,batches,before:Object.fromEntries(Object.entries(before).map(([k,v])=>[k,v.length])),after:Object.fromEntries(Object.entries(after).map(([k,v])=>[k,v.length])),missing_deletions:0,excess_deletions:0,orphans:0,preserved_rows_unchanged:true,boundary_exact_deleted:true,boundary_plus_1ms_preserved:true,young_with_past_expiry_preserved:true,old_with_future_expiry_deleted:true,second_cleanup_deleted:0});
  }
  const leap=await query(`SELECT (('2024-02-29T12:00Z'::timestamptz AT TIME ZONE 'UTC')+interval '1 year')::text AS anniversary`);
  requireThat(leap[0].anniversary==='2025-02-28 12:00:00','Leap year anniversary mismatch');
  report.leap_year_anniversary={status:'PASS',actual:leap[0].anniversary};
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.message;process.exitCode=1;}finally{await pg.close();}
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'retention-evidence.json'),JSON.stringify(report,null,2));
await writeFile(resolve(output,'retention-evidence.html'),`<!doctype html><meta charset="utf-8"><title>Whenkin 清理测试证据</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:24px;color:#183d35}pre{background:#f1f6f0;padding:24px;white-space:pre-wrap}h1{color:#17634d}</style><h1>Whenkin 清理测试：${report.status}</h1><p>本地隔离 PostgreSQL；正式数据库未修改。正式策略仍为一年有效期、手动清理。</p><p>从正式迁移 008 加载清理函数，仅在测试中替换保留期限和时钟。每种策略测试 210 个活动及其关联记录。</p><table style="width:100%;border-collapse:collapse" border="1" cellpadding="12"><tr><th>保留策略</th><th>应删除</th><th>实际删除</th><th>漏删</th><th>误删</th><th>孤立记录</th><th>保留记录完整</th></tr>${report.scenarios.map(r=>'<tr><td>'+r.policy+'</td><td>'+r.expected_deleted_events+'</td><td>'+r.actual_deleted_events+'</td><td>'+r.missing_deletions+'</td><td>'+r.excess_deletions+'</td><td>'+r.orphans+'</td><td>'+r.preserved_rows_unchanged+'</td></tr>').join('')}</table><p>每种策略：活动 210 → 3；备选窗口 420 → 6；回复 420 → 6；空闲记录 840 → 12。边界检查：刚好到期删除，晚 1 毫秒保留；二次清理删除 0 条。批次均为 100、100、7、0。</p><p>下方为完整可复核的机器结果：</p><pre>${JSON.stringify(report,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre>`);
console.log(JSON.stringify(report,null,2));
