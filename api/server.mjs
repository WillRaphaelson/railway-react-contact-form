import { createServer } from 'node:http';
import { mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const directory = process.env.DATA_DIR || './data';
await mkdir(directory, { recursive: true });
let accepted = [];
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/contact') return json(res, 404, { error: 'Not found.' });
  if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Use application/json.' });
  try {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 16384) return json(res, 413, { error: 'Submission too large.' });
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString()); }
    catch { return json(res, 400, { error: 'Invalid JSON.' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(res, 400, { error: 'Invalid submission.' });
    const { name, email, message, website } = body;
    if (website) return json(res, 400, { error: 'Submission rejected.' });
    if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) {
      return json(res, 400, { error: 'Provide a name, a valid email, and a message of 10 to 2000 characters.' });
    }
    const now = Date.now();
    accepted = accepted.filter(time => now - time < 60000);
    if (accepted.length >= 30) return json(res, 429, { error: 'Too many submissions. Please try again in a minute.' });
    accepted.push(now);
    const record = { id: randomUUID(), createdAt: new Date().toISOString(), name: name.trim(), email: email.trim(), message: message.trim() };
    const file = await open(join(directory, 'submissions.jsonl'), 'a', 0o600);
    try { await file.writeFile(JSON.stringify(record) + '\n'); await file.sync(); }
    finally { await file.close(); }
    return json(res, 201, { id: record.id, saved: true });
  } catch (error) {
    console.error('Submission failed:', error.code || error.name);
    if (!res.headersSent) return json(res, 500, { error: 'Unable to save your message.' });
    res.end();
  }
}).listen(Number(process.env.PORT || 3001), '::', () => console.log('Contact API listening'));
