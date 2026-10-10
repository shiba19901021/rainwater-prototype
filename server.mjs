import http from 'node:http';
import { readFile } from 'node:fs/promises';
const page = new URL('./water-resilience-p0.html', import.meta.url);
http.createServer(async (req, res) => {
  if (!['/', '/water-resilience-p0.html'].includes(req.url)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  try { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(await readFile(page)); }
  catch { res.writeHead(500); res.end('Unable to read prototype'); }
}).listen(4173, '127.0.0.1', () => console.log('Prototype 1C.2: http://127.0.0.1:4173'));

