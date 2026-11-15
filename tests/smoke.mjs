// Run only against a disposable local database: node tests/smoke.mjs http://127.0.0.1:3000
import assert from 'node:assert/strict';
const base = new URL(process.argv[2] || 'http://127.0.0.1:3000');
assert(['127.0.0.1', 'localhost'].includes(base.hostname), 'Use a local test server. This check creates a test event.');
const request = async (path, method = 'GET', data) => {
  const response = await fetch(new URL('/api' + path, base), {
    method, headers: { 'Content-Type': 'application/json', Origin: base.origin },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: response.status, body: await response.json() };
};
let ready = false;
for (let i = 0; i < 60; i++) {
  try { ready = (await request('/health')).body.ready; } catch { /* Server is starting. */ }
  if (ready) break;
  await new Promise(resolve => setTimeout(resolve, 1000));
}
assert(ready, 'Server and migrated database did not become ready.');
const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const created = await request('/events', 'POST', { title: 'Local migration smoke check', timezone: 'UTC', dates: [date], startTime: '09:00', endTime: '10:00' });
assert.equal(created.status, 201);
const path = '/events/' + created.body.id;
let event = (await request(path)).body;
assert.equal(event.windows.length, 1);
const alice = await request(path + '/responses', 'POST', { name: 'Test Alice', timezone: 'UTC', ranges: event.windows });
const bob = await request(path + '/responses', 'POST', { name: 'Test Bob', timezone: 'UTC', ranges: [] });
assert.equal(alice.status, 201);
assert.equal(bob.status, 201);
assert.equal((await request(path)).body.candidates.length, 0);
const update = { name: 'Test Bob', timezone: 'UTC', ranges: event.windows, revision: bob.body.revision };
const saved = await request(path + '/responses/' + bob.body.id, 'PUT', update);
assert.equal(saved.status, 200);
event = (await request(path)).body;
assert.equal(event.candidates.length, 1);
assert.equal(event.candidates[0].available.length, 2);
assert.equal((await request(path + '/responses/' + bob.body.id, 'PUT', update)).status, 409);
assert.equal((await request(path + '/responses/' + bob.body.id, 'DELETE', { revision: saved.body.revision })).status, 200);
assert.equal((await request(path)).body.responses.length, 1);
assert.equal((await request(path + '/responses/' + alice.body.id, 'DELETE', { revision: alice.body.revision })).status, 200);
assert.equal((await request(path)).body.candidates.length, 0);
const page = await fetch(new URL('/e/' + created.body.id, base));
assert.equal(page.status, 200);
assert.match(await page.text(), /id="root"/);
assert.equal((await fetch(new URL('/api/missing', base))).status, 404);
console.log('PASS: PostgreSQL readiness, event creation/read, response create/update/delete, shared times, stale-write protection, direct page links.');
