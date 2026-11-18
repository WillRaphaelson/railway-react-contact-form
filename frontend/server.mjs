import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const api = process.env.API_URL || (process.env.API_HOST ? `http://${process.env.API_HOST}:3001` : 'http://localhost:3001');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); };
createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/health' && req.method === 'GET') return json(res, 200, { ok:true });
    if (pathname === '/api/contact') {
      if (req.method !== 'POST') return json(res, 405, { error:'Use POST.' });
      if (req.headers.origin) {
        let host;
        try { host = new URL(req.headers.origin).host; } catch { return json(res, 403, { error:'Invalid origin.' }); }
        if (host !== req.headers.host) return json(res, 403, { error:'Origin not allowed.' });
      }
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error:'Use application/json.' });
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 16384) return json(res, 413, { error:'Submission too large.' });
        chunks.push(chunk);
      }
      const upstream = await fetch(new URL('/contact', api), { method:'POST', headers:{ 'Content-Type':'application/json' }, body:Buffer.concat(chunks), signal:AbortSignal.timeout(8000) });
      res.writeHead(upstream.status, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
      return res.end(await upstream.text());
    }
    if (!['GET','HEAD'].includes(req.method)) return json(res, 405, { error:'Method not allowed.' });
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { return json(res, 400, { error:'Invalid path.' }); }
    let path = resolve(root, '.' + decoded);
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) return json(res, 403, { error:'Invalid path.' });
    let data;
    try { if (!extname(path)) throw new Error('SPA'); data = await readFile(path); }
    catch {
      if (extname(path)) return json(res, 404, { error:'Asset not found.' });
      path = resolve(root, 'index.html'); data = await readFile(path);
    }
    res.writeHead(200, { 'Content-Type':types[extname(path)] || 'application/octet-stream', 'Cache-Control':path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { return json(res, 502, { error:'Service unavailable. Please try again.' }); }
}).listen(Number(process.env.PORT || 3000), '::', () => console.log('Frontend listening'));
