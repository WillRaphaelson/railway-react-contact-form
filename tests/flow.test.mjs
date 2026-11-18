import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

const root = new URL('../', import.meta.url);
async function start(file, env) {
  const child = spawn(process.execPath, [new URL(file, root).pathname], { env: { ...process.env, ...env }, stdio: ['ignore','pipe','pipe'] });
  let output = '';
  child.stdout.on('data', b => output += b);
  child.stderr.on('data', b => output += b);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    if (output.includes('listening')) return child;
    await new Promise(r => setTimeout(r, 30));
  }
  child.kill();
  throw new Error('Server did not start: ' + output);
}
async function stop(child) { if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } }

test('frontend serves nested routes and API validates and persists submissions across restart', async t => {
  const data = await mkdtemp(join(tmpdir(),'contact-test-'));
  let api = await start('api/server.mjs', { PORT:'14391', DATA_DIR:data });
  const web = await start('frontend/server.mjs', { PORT:'14390', API_URL:'http://localhost:14391' });
  t.after(async () => { await stop(web); await stop(api); await rm(data, { recursive:true, force:true }); });
  const base = 'http://localhost:14390';
  for (const route of ['/', '/contact', '/plans/team']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<div id="root">/);
  }
  assert.equal((await fetch(base + '/missing.js')).status, 404);
  const send = (body, headers = {}) => fetch(base + '/api/contact', { method:'POST', headers:{ 'Content-Type':'application/json', ...headers }, body:JSON.stringify(body) });
  const message = { name:'Alex Example', email:'alex@example.com', message:'A fictional deployment test message.' };
  assert.equal((await send({ ...message, email:'bad' })).status, 400);
  assert.equal((await send({ ...message, website:'spam' })).status, 400);
  assert.equal((await send(message, { Origin:'https://unrelated.example' })).status, 403);
  assert.equal((await send({ ...message, message:'x'.repeat(20000) })).status, 413);
  const saved = await send(message);
  assert.equal(saved.status, 201);
  const { id } = await saved.json();
  const path = join(data,'submissions.jsonl');
  const records = (await readFile(path,'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(records.length, 1);
  assert.equal(records[0].id, id);
  await stop(api);
  api = await start('api/server.mjs', { PORT:'14391', DATA_DIR:data });
  assert.equal((await readFile(path,'utf8')).trim().split('\n').length, 1);
  assert.equal((await send(message)).status, 201);
  assert.equal((await readFile(path,'utf8')).trim().split('\n').length, 2);
  for (let i=0; i<29; i++) assert.equal((await send(message)).status, 201);
  assert.equal((await send(message)).status, 429);
});
